#!/usr/bin/env bash
# Probe whether the current AWS identity can do everything plan/terraform needs.
# Read-only except for EC2 --dry-run calls (which change nothing).
#
# Usage:  ./check_permissions.sh [aws-profile]
# Output: summary on stdout, raw JSON under .permcheck/

set -uo pipefail
[[ -n "${1:-}" ]] && export AWS_PROFILE="$1"

OUT="$(dirname "$0")/.permcheck"
mkdir -p "$OUT"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-$(aws configure get region 2>/dev/null || echo us-east-1)}}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.large}"

say()  { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
ok()   { printf '  \033[32mOK  \033[0m %s\n' "$*"; }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$*"; }
info() { printf '  ..   %s\n' "$*"; }

# ---------------------------------------------------------------- identity
say "Identity (region $REGION)"
if ! IDENT=$(aws sts get-caller-identity --output json 2>"$OUT/identity.err"); then
  bad "sts get-caller-identity failed: $(cat "$OUT/identity.err")"; exit 1
fi
echo "$IDENT" > "$OUT/identity.json"
ARN=$(echo "$IDENT" | python3 -c 'import json,sys;print(json.load(sys.stdin)["Arn"])')
ACCOUNT=$(echo "$IDENT" | python3 -c 'import json,sys;print(json.load(sys.stdin)["Account"])')
info "$ARN"

# Principal ARN for the policy simulator: assumed-role -> role ARN, user -> user ARN.
case "$ARN" in
  *:assumed-role/*) ROLE_NAME=$(echo "$ARN" | cut -d/ -f2); PRINCIPAL="arn:aws:iam::$ACCOUNT:role/$ROLE_NAME";;
  *:user/*)         ROLE_NAME=""; PRINCIPAL="$ARN";;
  *:federated-user/*)
    # GetFederationToken session: effective permissions = calling IAM user's policy AND the
    # session policy. The simulator cannot evaluate that; rely on the dry-runs below.
    ROLE_NAME=""; PRINCIPAL="";;
  *)                ROLE_NAME=""; PRINCIPAL="$ARN";;
esac
info "policy source: $PRINCIPAL"

# ---------------------------------------------------------------- policies
say "Attached policy documents (saved to $OUT/policies/)"
mkdir -p "$OUT/policies"
if [[ -n "$ROLE_NAME" ]]; then
  if aws iam get-role --role-name "$ROLE_NAME" --output json >"$OUT/policies/role.json" 2>"$OUT/policies/role.err"; then
    ok "iam:GetRole"
    PB=$(python3 -c 'import json;r=json.load(open("'"$OUT"'/policies/role.json"))["Role"];print(r.get("PermissionsBoundary",{}).get("PermissionsBoundaryArn",""))')
    [[ -n "$PB" ]] && info "permissions boundary: $PB"
    for arn in $(aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null); do
      ver=$(aws iam get-policy --policy-arn "$arn" --query 'Policy.DefaultVersionId' --output text 2>/dev/null)
      name=$(basename "$arn")
      if aws iam get-policy-version --policy-arn "$arn" --version-id "$ver" --query 'PolicyVersion.Document' --output json >"$OUT/policies/managed-$name.json" 2>/dev/null; then
        ok "managed policy $arn -> managed-$name.json"
      else
        bad "could not read managed policy $arn"
      fi
    done
    for name in $(aws iam list-role-policies --role-name "$ROLE_NAME" --query 'PolicyNames[]' --output text 2>/dev/null); do
      if aws iam get-role-policy --role-name "$ROLE_NAME" --policy-name "$name" --query 'PolicyDocument' --output json >"$OUT/policies/inline-$name.json" 2>/dev/null; then
        ok "inline policy $name -> inline-$name.json"
      else
        bad "could not read inline policy $name"
      fi
    done
    if [[ -n "$PB" ]]; then
      ver=$(aws iam get-policy --policy-arn "$PB" --query 'Policy.DefaultVersionId' --output text 2>/dev/null)
      aws iam get-policy-version --policy-arn "$PB" --version-id "$ver" --query 'PolicyVersion.Document' --output json >"$OUT/policies/boundary.json" 2>/dev/null && ok "boundary -> boundary.json"
    fi
  else
    bad "iam:GetRole denied ($(head -c 200 "$OUT/policies/role.err")). Falling back to simulator + dry-runs."
  fi
else
  info "not an assumed role; skipping role policy dump"
fi

# ---------------------------------------------------------------- simulator
say "IAM policy simulator (SCPs may not be reflected; dry-runs below are authoritative)"
simulate() {
  local label="$1"; shift
  local res
  if [[ -z "$PRINCIPAL" ]]; then info "skipped for $label (federated-user session)"; return; fi
  if res=$(aws iam simulate-principal-policy \
        --policy-source-arn "$PRINCIPAL" \
        --action-names "$@" \
        --context-entries "ContextKeyName=aws:RequestedRegion,ContextKeyValues=$REGION,ContextKeyType=string" \
        --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text 2>"$OUT/sim-$label.err"); then
    echo "$res" > "$OUT/sim-$label.txt"
    while read -r action decision; do
      [[ "$decision" == "allowed" ]] && ok "$action" || bad "$action ($decision)"
    done <<< "$res"
  else
    bad "simulate-principal-policy for $label failed: $(head -c 200 "$OUT/sim-$label.err")"
  fi
}
simulate ec2 ec2:DescribeVpcs ec2:DescribeSubnets ec2:DescribeImages ec2:DescribeSecurityGroups \
  ec2:CreateSecurityGroup ec2:AuthorizeSecurityGroupIngress ec2:AuthorizeSecurityGroupEgress \
  ec2:RevokeSecurityGroupEgress ec2:DeleteSecurityGroup ec2:CreateTags ec2:DescribeTags \
  ec2:RunInstances ec2:DescribeInstances ec2:DescribeInstanceAttribute ec2:ModifyInstanceAttribute \
  ec2:DescribeInstanceTypes ec2:DescribeInstanceCreditSpecifications ec2:DescribeVolumes \
  ec2:DescribeNetworkInterfaces ec2:TerminateInstances \
  ec2:AllocateAddress ec2:AssociateAddress ec2:DisassociateAddress ec2:ReleaseAddress ec2:DescribeAddresses
simulate ssm ssm:GetParameter ssm:GetParameters ssm:StartSession
simulate s3 s3:CreateBucket s3:DeleteBucket s3:ListBucket s3:GetBucketLocation \
  s3:PutBucketPublicAccessBlock s3:GetBucketPublicAccessBlock s3:PutBucketCORS s3:GetBucketCORS \
  s3:PutBucketTagging s3:GetBucketTagging s3:GetBucketPolicy s3:GetBucketAcl s3:GetBucketVersioning \
  s3:GetBucketLogging s3:GetBucketWebsite s3:GetBucketRequestPayment s3:GetAccelerateConfiguration \
  s3:GetBucketObjectLockConfiguration s3:GetEncryptionConfiguration s3:GetLifecycleConfiguration \
  s3:GetReplicationConfiguration s3:GetBucketOwnershipControls s3:PutObject s3:GetObject
simulate iam iam:CreateRole iam:GetRole iam:DeleteRole iam:TagRole iam:ListRoleTags \
  iam:PutRolePolicy iam:GetRolePolicy iam:DeleteRolePolicy iam:ListRolePolicies \
  iam:AttachRolePolicy iam:DetachRolePolicy iam:ListAttachedRolePolicies \
  iam:CreateInstanceProfile iam:GetInstanceProfile iam:DeleteInstanceProfile \
  iam:AddRoleToInstanceProfile iam:RemoveRoleFromInstanceProfile iam:ListInstanceProfilesForRole \
  iam:PassRole iam:ListRoles iam:ListInstanceProfiles
simulate bedrock bedrock:InvokeModel bedrock:InvokeModelWithResponseStream bedrock:ListFoundationModels \
  bedrock:GetFoundationModel bedrock:GetFoundationModelAvailability bedrock:ListInferenceProfiles

# ---------------------------------------------------------------- real calls
say "Real read-only calls and EC2 dry-runs in $REGION"
if AMI=$(aws ssm get-parameter --region "$REGION" --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 --query Parameter.Value --output text 2>"$OUT/ami.err"); then
  ok "ssm:GetParameter AL2023 AMI = $AMI"
else
  bad "ssm:GetParameter AMI lookup: $(head -c 200 "$OUT/ami.err")"; AMI=""
fi

VPC=$(aws ec2 describe-vpcs --region "$REGION" --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text 2>"$OUT/vpc.err")
if [[ -n "$VPC" && "$VPC" != "None" ]]; then
  ok "default VPC = $VPC"
  SUBNET=$(aws ec2 describe-subnets --region "$REGION" --filters Name=vpc-id,Values="$VPC" --query 'Subnets[0].SubnetId' --output text 2>/dev/null)
  info "first subnet = $SUBNET"
else
  bad "no default VPC in $REGION (or describe denied: $(head -c 200 "$OUT/vpc.err")). Terraform needs one, or a vpc/subnet variable."
  SUBNET=""
  aws ec2 describe-vpcs --region "$REGION" --query 'Vpcs[].[VpcId,CidrBlock,IsDefault]' --output text 2>/dev/null | sed 's/^/       existing vpc: /'
fi

if aws ec2 describe-instance-type-offerings --region "$REGION" --location-type region --filters Name=instance-type,Values="$INSTANCE_TYPE" --query 'InstanceTypeOfferings[0].InstanceType' --output text 2>/dev/null | grep -q "$INSTANCE_TYPE"; then
  ok "$INSTANCE_TYPE offered in $REGION"
else
  bad "$INSTANCE_TYPE not offered in $REGION (or describe denied)"
fi

dryrun() {  # dryrun <label> <aws args...>
  local label="$1"; shift
  local err
  err=$(aws "$@" --dry-run --region "$REGION" 2>&1)
  if echo "$err" | grep -q "DryRunOperation"; then ok "$label (dry-run would succeed)"
  else bad "$label: $(echo "$err" | head -c 250 | tr '\n' ' ')"; fi
}
[[ -n "$VPC" && "$VPC" != "None" ]] && dryrun "ec2 create-security-group" ec2 create-security-group --group-name permcheck-tmp --description permcheck --vpc-id "$VPC"
dryrun "ec2 allocate-address" ec2 allocate-address --domain vpc
if [[ -n "$AMI" && -n "$SUBNET" && "$SUBNET" != "None" ]]; then
  dryrun "ec2 run-instances $INSTANCE_TYPE" ec2 run-instances --image-id "$AMI" --instance-type "$INSTANCE_TYPE" --subnet-id "$SUBNET" --count 1
  dryrun "ec2 run-instances $INSTANCE_TYPE (with IMDSv2 + 60GB gp3)" ec2 run-instances --image-id "$AMI" --instance-type "$INSTANCE_TYPE" --subnet-id "$SUBNET" --count 1 \
     --metadata-options HttpTokens=required --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=60,VolumeType=gp3}'
fi

aws s3api list-buckets --query 'Buckets[].Name' --output text >"$OUT/buckets.txt" 2>"$OUT/buckets.err" && ok "s3:ListAllMyBuckets ($(wc -w <"$OUT/buckets.txt") buckets)" || bad "s3 list-buckets: $(head -c 200 "$OUT/buckets.err")"

if aws iam list-instance-profiles --query 'InstanceProfiles[].[InstanceProfileName,Roles[0].RoleName]' --output text >"$OUT/instance-profiles.txt" 2>"$OUT/ip.err"; then
  ok "iam:ListInstanceProfiles - existing profiles (reuse one if CreateRole is denied):"
  sed 's/^/       /' "$OUT/instance-profiles.txt" | head -20
else
  bad "iam list-instance-profiles: $(head -c 200 "$OUT/ip.err")"
fi

# ---------------------------------------------------------------- bedrock
say "Bedrock in $REGION"
if aws bedrock list-foundation-models --region "$REGION" --by-provider anthropic --query 'modelSummaries[].modelId' --output text >"$OUT/bedrock-anthropic.txt" 2>"$OUT/bedrock.err"; then
  ok "bedrock:ListFoundationModels - Anthropic models offered here:"
  tr '\t' '\n' <"$OUT/bedrock-anthropic.txt" | sed 's/^/       /'
else
  bad "bedrock list-foundation-models: $(head -c 200 "$OUT/bedrock.err")"
fi
aws bedrock list-foundation-models --region "$REGION" --by-provider amazon --query 'modelSummaries[?contains(modelId,`embed`)].modelId' --output text 2>/dev/null | tr '\t' '\n' | sed 's/^/       embed: /'
aws bedrock list-inference-profiles --region "$REGION" --query 'inferenceProfileSummaries[?contains(inferenceProfileId,`anthropic`)].inferenceProfileId' --output text >"$OUT/bedrock-profiles.txt" 2>/dev/null && { info "cross-region inference profiles:"; tr '\t' '\n' <"$OUT/bedrock-profiles.txt" | sed 's/^/       /'; }
# get-foundation-model-availability needs AWS CLI >= 2.22; silently skipped on older CLIs.
for m in $(tr '\t' '\n' <"$OUT/bedrock-anthropic.txt" 2>/dev/null | grep -E 'claude-(opus|sonnet|haiku)' | sort -u) amazon.titan-embed-text-v2:0; do
  if av=$(aws bedrock get-foundation-model-availability --region "$REGION" --model-id "$m" --query '[agreementAvailability.status,authorizationStatus,entitlementAvailability,regionAvailability]' --output text 2>/dev/null); then
    info "availability $m -> agreement/authorization/entitlement/region: $av"
  fi
done

say "Done. Raw output in $OUT/"
