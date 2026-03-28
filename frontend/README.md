# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.










┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  Dashboard │ Agents │ Workflows │ Incidents │ Analytics          │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTP/WebSocket
┌─────────────────────▼───────────────────────────────────────────┐
│                   BACKEND (Node.js/Express)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Agent Orchestrator (Coordinator)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│     ┌─────────────────────┼─────────────────────┐               │
│     │                     │                     │               │
│  ┌──▼──┐  ┌──────┐   ┌───▼────┐   ┌──────┐  ┌─▼─────┐         │
│  │ Log │  │Crash │   │Resource│   │Anomaly│  │Recovery│ ...    │
│  │Intel│  │Diag  │   │ Optim  │   │Detect│  │ Agent  │         │
│  └──┬──┘  └──┬───┘   └───┬────┘   └──┬───┘  └───┬────┘         │
│     └─────────┴───────────┴───────────┴──────────┘              │
│                           │                                      │
│                      ┌────▼─────┐                                │
│                      │ RabbitMQ │ (Message Queue)                │
│                      └──────────┘                                │
└──────────────────────────────────────────────────────────────────┘
                      │        │        │
        ┌─────────────┼────────┼────────┼─────────────┐
        │             │        │        │             │
    ┌───▼───┐    ┌───▼───┐ ┌──▼──┐  ┌──▼────┐    ┌──▼──┐
    │MongoDB│    │ Redis │ │FAISS│  │LangChain│  │ AWS │
    │       │    │       │ │     │  │(Claude) │  │ K8s │
    └───────┘    └───────┘ └─────┘  └─────────┘  └─────┘


IAM Permissions required to execute in our application:
IMPORTANT

IAM Permissions (Least Privilege):

EC2: ec2:DescribeInstances, ec2:DescribeInstanceStatus, ec2:RebootInstances, ec2:StartInstances, ec2:StopInstances
Lambda: lambda:ListFunctions, lambda:GetFunction, lambda:InvokeFunction, lambda:GetFunctionConfiguration
RDS: rds:DescribeDBInstances, rds:DescribeDBClusters, rds:RebootDBInstance, rds:DescribeEvents
CloudWatch: logs:DescribeLogGroups, logs:FilterLogEvents (existing), cloudwatch:GetMetricData, cloudwatch:ListMetrics, cloudwatch:DescribeAlarms
Cost Explorer: ce:GetCostAndUsage, ce:GetCostForecast
General: sts:GetCallerIdentity