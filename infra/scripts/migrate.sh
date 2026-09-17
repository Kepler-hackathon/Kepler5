#!/usr/bin/env bash
# backend-plan.md §13: run database migrations as a one-off ECS task using the web image,
# never at container start. Reads everything it needs from the stack outputs.
set -euo pipefail

STACK="${STACK:-KeplerStack}"
REGION="${AWS_REGION:-us-east-1}"

out() { aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }

CLUSTER=$(out EcsClusterName)
TASKDEF=$(out WebTaskDefinitionArn)
SUBNETS=$(out AppSubnetIds)
SG=$(out AppSecurityGroupId)

echo "Running migrations on $CLUSTER using $TASKDEF"
TASK_ARN=$(aws ecs run-task --region "$REGION" --cluster "$CLUSTER" --launch-type FARGATE \
  --task-definition "$TASKDEF" \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"web","command":["node","migrate.js"]}]}' \
  --query 'tasks[0].taskArn' --output text)

echo "Task: $TASK_ARN — waiting"
aws ecs wait tasks-stopped --region "$REGION" --cluster "$CLUSTER" --tasks "$TASK_ARN"
EXIT=$(aws ecs describe-tasks --region "$REGION" --cluster "$CLUSTER" --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode' --output text)
echo "Migration task exited with $EXIT"
[ "$EXIT" = "0" ]
