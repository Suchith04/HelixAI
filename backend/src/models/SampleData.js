// {
//   "agents": [
//     {
//       "_id": {"$oid": "697d0000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "name": "LogIntelligence",
//       "displayName": "Log Intelligence Agent",
//       "description": "Analyzes logs using AI to detect patterns and issues",
//       "type": "analyzer",
//       "status": "active",
//       "configuration": {
//         "enabled": true,
//         "priority": 8,
//         "autoStart": true,
//         "maxConcurrentTasks": 5,
//         "retryAttempts": 3,
//         "timeoutMs": 30000
//       },
//       "customSettings": {
//         "logSources": ["cloudwatch", "kubernetes"],
//         "analysisDepth": "deep",
//         "patternDetection": true
//       },
//       "dependencies": ["AnomalyDetection"],
//       "metrics": {
//         "tasksProcessed": 1247,
//         "successfulTasks": 1198,
//         "failedTasks": 49,
//         "averageProcessingTime": 2345,
//         "lastActive": {"$date": "2026-01-31T10:30:00.000Z"}
//       },
//       "schedules": [
//         {
//           "type": "interval",
//           "value": "5m",
//           "enabled": true,
//           "lastRun": {"$date": "2026-01-31T10:25:00.000Z"},
//           "nextRun": {"$date": "2026-01-31T10:30:00.000Z"}
//         }
//       ],
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T10:30:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d0000000000000000002"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "name": "CrashDiagnostic",
//       "displayName": "Crash Diagnostic Agent",
//       "description": "Diagnoses application crashes and provides root cause analysis",
//       "type": "analyzer",
//       "status": "active",
//       "configuration": {
//         "enabled": true,
//         "priority": 9,
//         "autoStart": true,
//         "maxConcurrentTasks": 3,
//         "retryAttempts": 2,
//         "timeoutMs": 45000
//       },
//       "customSettings": {
//         "stackTraceAnalysis": true,
//         "memoryDumpAnalysis": false,
//         "autoCreateIncidents": true
//       },
//       "dependencies": ["LogIntelligence", "Recommendation"],
//       "metrics": {
//         "tasksProcessed": 89,
//         "successfulTasks": 84,
//         "failedTasks": 5,
//         "averageProcessingTime": 8932,
//         "lastActive": {"$date": "2026-01-31T09:45:00.000Z"}
//       },
//       "schedules": [],
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T09:45:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d0000000000000000003"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "name": "ResourceOptimization",
//       "displayName": "Resource Optimization Agent",
//       "description": "Optimizes cloud resource allocation and utilization",
//       "type": "optimizer",
//       "status": "active",
//       "configuration": {
//         "enabled": true,
//         "priority": 6,
//         "autoStart": true,
//         "maxConcurrentTasks": 10,
//         "retryAttempts": 3,
//         "timeoutMs": 60000
//       },
//       "customSettings": {
//         "optimizationStrategy": "cost-performance-balanced",
//         "autoScaling": true,
//         "rightSizing": true
//       },
//       "dependencies": ["AnomalyDetection"],
//       "metrics": {
//         "tasksProcessed": 456,
//         "successfulTasks": 442,
//         "failedTasks": 14,
//         "averageProcessingTime": 5621,
//         "lastActive": {"$date": "2026-01-31T10:15:00.000Z"}
//       },
//       "schedules": [
//         {
//           "type": "cron",
//           "value": "0 */6 * * *",
//           "enabled": true,
//           "lastRun": {"$date": "2026-01-31T06:00:00.000Z"},
//           "nextRun": {"$date": "2026-01-31T12:00:00.000Z"}
//         }
//       ],
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T10:15:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d0000000000000000004"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "name": "AnomalyDetection",
//       "displayName": "Anomaly Detection Agent",
//       "description": "Detects anomalies in metrics and system behavior",
//       "type": "detector",
//       "status": "active",
//       "configuration": {
//         "enabled": true,
//         "priority": 10,
//         "autoStart": true,
//         "maxConcurrentTasks": 8,
//         "retryAttempts": 3,
//         "timeoutMs": 25000
//       },
//       "customSettings": {
//         "mlModel": "isolation-forest",
//         "sensitivity": "medium",
//         "predictionEnabled": true
//       },
//       "dependencies": [],
//       "metrics": {
//         "tasksProcessed": 2134,
//         "successfulTasks": 2098,
//         "failedTasks": 36,
//         "averageProcessingTime": 1823,
//         "lastActive": {"$date": "2026-01-31T10:28:00.000Z"}
//       },
//       "schedules": [
//         {
//           "type": "interval",
//           "value": "2m",
//           "enabled": true,
//           "lastRun": {"$date": "2026-01-31T10:26:00.000Z"},
//           "nextRun": {"$date": "2026-01-31T10:28:00.000Z"}
//         }
//       ],
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T10:28:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d0000000000000000005"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "name": "Recovery",
//       "displayName": "Auto Recovery Agent",
//       "description": "Automatically recovers from failures and incidents",
//       "type": "healer",
//       "status": "inactive",
//       "configuration": {
//         "enabled": false,
//         "priority": 7,
//         "autoStart": false,
//         "maxConcurrentTasks": 2,
//         "retryAttempts": 1,
//         "timeoutMs": 120000
//       },
//       "customSettings": {
//         "requireApproval": true,
//         "maxRiskLevel": 3,
//         "snapshotBeforeAction": true
//       },
//       "dependencies": ["CrashDiagnostic", "AnomalyDetection"],
//       "metrics": {
//         "tasksProcessed": 0,
//         "successfulTasks": 0,
//         "failedTasks": 0,
//         "averageProcessingTime": 0,
//         "lastActive": null
//       },
//       "schedules": [],
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-30T18:56:14.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d0000000000000000006"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "name": "Recommendation",
//       "displayName": "Recommendation Agent",
//       "description": "Provides intelligent recommendations for improvements",
//       "type": "reporter",
//       "status": "active",
//       "configuration": {
//         "enabled": true,
//         "priority": 5,
//         "autoStart": true,
//         "maxConcurrentTasks": 5,
//         "retryAttempts": 3,
//         "timeoutMs": 40000
//       },
//       "customSettings": {
//         "categories": ["performance", "cost", "security"],
//         "minConfidence": 0.7,
//         "includeImplementationSteps": true
//       },
//       "dependencies": ["LogIntelligence", "ResourceOptimization", "AnomalyDetection"],
//       "metrics": {
//         "tasksProcessed": 234,
//         "successfulTasks": 228,
//         "failedTasks": 6,
//         "averageProcessingTime": 12456,
//         "lastActive": {"$date": "2026-01-31T08:00:00.000Z"}
//       },
//       "schedules": [
//         {
//           "type": "cron",
//           "value": "0 8 * * *",
//           "enabled": true,
//           "lastRun": {"$date": "2026-01-31T08:00:00.000Z"},
//           "nextRun": {"$date": "2026-02-01T08:00:00.000Z"}
//         }
//       ],
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T08:00:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d0000000000000000007"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "name": "CostOptimization",
//       "displayName": "Cost Optimization Agent",
//       "description": "Analyzes and optimizes cloud spending",
//       "type": "optimizer",
//       "status": "active",
//       "configuration": {
//         "enabled": true,
//         "priority": 6,
//         "autoStart": true,
//         "maxConcurrentTasks": 4,
//         "retryAttempts": 3,
//         "timeoutMs": 90000
//       },
//       "customSettings": {
//         "analysisFrequency": "daily",
//         "includeReservedInstances": true,
//         "wasteDetection": true
//       },
//       "dependencies": ["ResourceOptimization"],
//       "metrics": {
//         "tasksProcessed": 31,
//         "successfulTasks": 31,
//         "failedTasks": 0,
//         "averageProcessingTime": 45678,
//         "lastActive": {"$date": "2026-01-31T00:00:00.000Z"}
//       },
//       "schedules": [
//         {
//           "type": "cron",
//           "value": "0 0 * * *",
//           "enabled": true,
//           "lastRun": {"$date": "2026-01-31T00:00:00.000Z"},
//           "nextRun": {"$date": "2026-02-01T00:00:00.000Z"}
//         }
//       ],
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T00:00:00.000Z"}
//     }
//   ],

//   "agentStates": [
//     {
//       "_id": {"$oid": "697d1000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "agent": {"$oid": "697d0000000000000000004"},
//       "agentName": "AnomalyDetection",
//       "status": "working",
//       "currentTask": {
//         "id": "task-anom-1234",
//         "type": "metric_analysis",
//         "description": "Analyzing CPU metrics for anomalies",
//         "startTime": {"$date": "2026-01-31T10:27:00.000Z"},
//         "progress": 65,
//         "estimatedCompletion": {"$date": "2026-01-31T10:29:00.000Z"}
//       },
//       "lastAction": {
//         "type": "detect_anomaly",
//         "timestamp": {"$date": "2026-01-31T10:26:30.000Z"},
//         "result": {
//           "anomaliesFound": 2,
//           "severity": "medium"
//         }
//       },
//       "metrics": {
//         "tasksCompleted": 87,
//         "tasksToday": 12,
//         "averageConfidence": 0.89,
//         "successRate": 0.96,
//         "errorCount": 3,
//         "uptime": 86400,
//         "lastError": {
//           "message": "Timeout while fetching metrics",
//           "timestamp": {"$date": "2026-01-30T14:23:00.000Z"},
//           "stack": "Error: Timeout..."
//         }
//       },
//       "confidence": 0.87,
//       "memory": [
//         {
//           "timestamp": {"$date": "2026-01-31T09:00:00.000Z"},
//           "event": "high_cpu_detected",
//           "context": {"service": "api-gateway", "value": 92.5},
//           "outcome": {"action": "alert_created"},
//           "importance": 0.9
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T08:30:00.000Z"},
//           "event": "memory_spike",
//           "context": {"service": "worker-pool", "value": 88.2},
//           "outcome": {"action": "resolved_automatically"},
//           "importance": 0.7
//         }
//       ],
//       "collaborations": [
//         {
//           "withAgent": "LogIntelligence",
//           "timestamp": {"$date": "2026-01-31T10:15:00.000Z"},
//           "query": "Check logs for service api-gateway",
//           "response": {"logCount": 1247, "errorCount": 23}
//         }
//       ],
//       "resourceUsage": {
//         "cpu": 15.3,
//         "memory": 234.5,
//         "lastUpdated": {"$date": "2026-01-31T10:27:00.000Z"}
//       },
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T10:27:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d1000000000000000002"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "agent": {"$oid": "697d0000000000000000001"},
//       "agentName": "LogIntelligence",
//       "status": "idle",
//       "currentTask": null,
//       "lastAction": {
//         "type": "analyze_logs",
//         "timestamp": {"$date": "2026-01-31T10:25:00.000Z"},
//         "result": {
//           "logsProcessed": 5423,
//           "patternsFound": 7,
//           "errorsDetected": 12
//         }
//       },
//       "metrics": {
//         "tasksCompleted": 156,
//         "tasksToday": 24,
//         "averageConfidence": 0.92,
//         "successRate": 0.98,
//         "errorCount": 1,
//         "uptime": 86400
//       },
//       "confidence": 0.91,
//       "memory": [],
//       "collaborations": [],
//       "resourceUsage": {
//         "cpu": 8.2,
//         "memory": 156.8,
//         "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//       },
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T10:25:00.000Z"}
//     }
//   ],

//   "incidents": [
//     {
//       "_id": {"$oid": "697d2000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "incidentId": "INC-2026-001",
//       "title": "High CPU Usage on API Gateway Service",
//       "description": "API Gateway service experiencing sustained high CPU usage (>90%) causing increased latency",
//       "severity": "high",
//       "status": "investigating",
//       "category": "performance",
//       "source": {
//         "agent": "AnomalyDetection",
//         "service": "api-gateway",
//         "resource": "i-0abc123def456",
//         "region": "us-east-1"
//       },
//       "affectedServices": [
//         {
//           "name": "api-gateway",
//           "type": "ec2",
//           "impact": "major"
//         },
//         {
//           "name": "user-service",
//           "type": "ecs",
//           "impact": "minor"
//         }
//       ],
//       "rootCause": {
//         "identified": true,
//         "description": "Memory leak in request handler causing excessive CPU consumption",
//         "confidence": 0.85,
//         "identifiedBy": "CrashDiagnostic",
//         "identifiedAt": {"$date": "2026-01-31T09:45:00.000Z"}
//       },
//       "timeline": [
//         {
//           "timestamp": {"$date": "2026-01-31T09:00:00.000Z"},
//           "event": "incident_created",
//           "description": "High CPU anomaly detected",
//           "by": "agent",
//           "actor": "AnomalyDetection"
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T09:15:00.000Z"},
//           "event": "status_changed",
//           "description": "Status changed to investigating",
//           "by": "system",
//           "actor": "system"
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T09:45:00.000Z"},
//           "event": "root_cause_identified",
//           "description": "Memory leak identified in request handler",
//           "by": "agent",
//           "actor": "CrashDiagnostic"
//         }
//       ],
//       "actions": [
//         {
//           "type": "automated",
//           "action": "Collect heap dump for analysis",
//           "status": "completed",
//           "agent": "CrashDiagnostic",
//           "startedAt": {"$date": "2026-01-31T09:20:00.000Z"},
//           "completedAt": {"$date": "2026-01-31T09:30:00.000Z"},
//           "result": {"success": true, "dumpSize": "2.3GB"}
//         },
//         {
//           "type": "recommendation",
//           "action": "Restart service with memory limit increase",
//           "status": "pending",
//           "agent": "Recommendation",
//           "startedAt": {"$date": "2026-01-31T09:50:00.000Z"},
//           "completedAt": null,
//           "result": null
//         }
//       ],
//       "metrics": {
//         "timeToDetection": 120,
//         "timeToAcknowledge": 300,
//         "timeToResolve": null,
//         "totalDowntime": 0
//       },
//       "assignee": {"$oid": "697cfece7c26f5527dbbb923"},
//       "relatedIncidents": [],
//       "relatedLogs": [],
//       "relatedAnomalies": [{"$oid": "697d3000000000000000001"}],
//       "tags": ["performance", "cpu", "api-gateway"],
//       "notes": [
//         {
//           "content": "Investigating memory leak. Heap dump collected for analysis.",
//           "author": {"$oid": "697cfece7c26f5527dbbb923"},
//           "createdAt": {"$date": "2026-01-31T09:25:00.000Z"}
//         }
//       ],
//       "resolvedAt": null,
//       "closedAt": null,
//       "createdAt": {"$date": "2026-01-31T09:00:00.000Z"},
//       "updatedAt": {"$date": "2026-01-31T10:00:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d2000000000000000002"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "incidentId": "INC-2026-002",
//       "title": "Database Connection Pool Exhaustion",
//       "description": "RDS connection pool exhausted, causing failed database queries",
//       "severity": "critical",
//       "status": "resolved",
//       "category": "availability",
//       "source": {
//         "agent": "LogIntelligence",
//         "service": "user-service",
//         "resource": "rds-postgres-prod",
//         "region": "us-east-1"
//       },
//       "affectedServices": [
//         {
//           "name": "user-service",
//           "type": "ecs",
//           "impact": "critical"
//         },
//         {
//           "name": "auth-service",
//           "type": "ecs",
//           "impact": "major"
//         }
//       ],
//       "rootCause": {
//         "identified": true,
//         "description": "Connection leak due to unclosed database connections in error paths",
//         "confidence": 0.95,
//         "identifiedBy": "LogIntelligence",
//         "identifiedAt": {"$date": "2026-01-30T15:30:00.000Z"}
//       },
//       "timeline": [
//         {
//           "timestamp": {"$date": "2026-01-30T15:00:00.000Z"},
//           "event": "incident_created",
//           "description": "Connection pool exhaustion detected",
//           "by": "agent",
//           "actor": "LogIntelligence"
//         },
//         {
//           "timestamp": {"$date": "2026-01-30T15:10:00.000Z"},
//           "event": "severity_escalated",
//           "description": "Escalated to critical - service unavailable",
//           "by": "system",
//           "actor": "system"
//         },
//         {
//           "timestamp": {"$date": "2026-01-30T15:45:00.000Z"},
//           "event": "incident_resolved",
//           "description": "Connection pool restarted, normal operations resumed",
//           "by": "user",
//           "actor": "siddharth diddi"
//         }
//       ],
//       "actions": [
//         {
//           "type": "manual",
//           "action": "Restart application services",
//           "status": "completed",
//           "agent": null,
//           "startedAt": {"$date": "2026-01-30T15:35:00.000Z"},
//           "completedAt": {"$date": "2026-01-30T15:42:00.000Z"},
//           "result": {"success": true}
//         }
//       ],
//       "metrics": {
//         "timeToDetection": 60,
//         "timeToAcknowledge": 180,
//         "timeToResolve": 2700,
//         "totalDowntime": 2400
//       },
//       "assignee": {"$oid": "697cfece7c26f5527dbbb923"},
//       "relatedIncidents": [],
//       "relatedLogs": [],
//       "relatedAnomalies": [],
//       "tags": ["database", "connection-pool", "critical"],
//       "notes": [],
//       "resolvedAt": {"$date": "2026-01-30T15:45:00.000Z"},
//       "closedAt": {"$date": "2026-01-30T16:00:00.000Z"},
//       "createdAt": {"$date": "2026-01-30T15:00:00.000Z"},
//       "updatedAt": {"$date": "2026-01-30T16:00:00.000Z"}
//     }
//   ],

//   "anomalies": [
//     {
//       "_id": {"$oid": "697d3000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "anomalyId": "ANOM-2026-001",
//       "type": "spike",
//       "metric": {
//         "name": "cpu_utilization",
//         "type": "cpu",
//         "unit": "percent"
//       },
//       "source": {
//         "service": "api-gateway",
//         "instance": "i-0abc123def456",
//         "resource": "ec2",
//         "region": "us-east-1"
//       },
//       "detection": {
//         "method": "statistical",
//         "model": "z-score",
//         "score": 0.94,
//         "confidence": 0.92,
//         "baseline": 45.2,
//         "observed": 92.8,
//         "deviation": 3.8
//       },
//       "severity": "high",
//       "status": "active",
//       "prediction": {
//         "isPredictive": false,
//         "predictedTime": null,
//         "predictedImpact": null,
//         "probability": null
//       },
//       "correlations": [
//         {
//           "anomalyId": "ANOM-2026-003",
//           "metric": "memory_utilization",
//           "correlation": 0.87
//         }
//       ],
//       "timeline": [
//         {
//           "timestamp": {"$date": "2026-01-31T08:00:00.000Z"},
//           "value": 42.3
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T08:30:00.000Z"},
//           "value": 68.5
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T09:00:00.000Z"},
//           "value": 92.8
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T09:30:00.000Z"},
//           "value": 91.2
//         }
//       ],
//       "analysis": {
//         "llmInsights": "The CPU spike correlates with increased memory usage, suggesting a memory leak causing garbage collection overhead. The pattern started at 08:30 UTC and has been sustained for over an hour.",
//         "suggestedActions": [
//           "Investigate memory usage patterns",
//           "Check for memory leaks in recent deployments",
//           "Consider scaling horizontally to distribute load"
//         ],
//         "relatedPatterns": ["memory_leak_pattern", "gc_overhead"]
//       },
//       "relatedIncident": {"$oid": "697d2000000000000000001"},
//       "acknowledgedBy": {"$oid": "697cfece7c26f5527dbbb923"},
//       "acknowledgedAt": {"$date": "2026-01-31T09:10:00.000Z"},
//       "resolvedAt": null,
//       "detectedAt": {"$date": "2026-01-31T09:00:00.000Z"},
//       "createdAt": {"$date": "2026-01-31T09:00:00.000Z"},
//       "updatedAt": {"$date": "2026-01-31T09:10:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d3000000000000000002"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "anomalyId": "ANOM-2026-002",
//       "type": "threshold_breach",
//       "metric": {
//         "name": "disk_utilization",
//         "type": "disk",
//         "unit": "percent"
//       },
//       "source": {
//         "service": "log-processor",
//         "instance": "i-0def456ghi789",
//         "resource": "ec2",
//         "region": "us-east-1"
//       },
//       "detection": {
//         "method": "threshold",
//         "model": "static_threshold",
//         "score": 0.98,
//         "confidence": 1.0,
//         "baseline": 70,
//         "observed": 94.5,
//         "deviation": 24.5
//       },
//       "severity": "medium",
//       "status": "resolved",
//       "prediction": {
//         "isPredictive": true,
//         "predictedTime": {"$date": "2026-02-02T00:00:00.000Z"},
//         "predictedImpact": "Disk will reach 100% capacity in 2 days if trend continues",
//         "probability": 0.85
//       },
//       "correlations": [],
//       "timeline": [
//         {
//           "timestamp": {"$date": "2026-01-30T00:00:00.000Z"},
//           "value": 88.2
//         },
//         {
//           "timestamp": {"$date": "2026-01-30T12:00:00.000Z"},
//           "value": 91.3
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T00:00:00.000Z"},
//           "value": 94.5
//         }
//       ],
//       "analysis": {
//         "llmInsights": "Disk usage trending upward due to log accumulation. Log rotation is not functioning properly.",
//         "suggestedActions": [
//           "Clean up old logs",
//           "Verify log rotation configuration",
//           "Consider increasing disk capacity or implementing log archival"
//         ],
//         "relatedPatterns": ["log_accumulation"]
//       },
//       "relatedIncident": null,
//       "acknowledgedBy": {"$oid": "697cfece7c26f5527dbbb923"},
//       "acknowledgedAt": {"$date": "2026-01-31T06:00:00.000Z"},
//       "resolvedAt": {"$date": "2026-01-31T07:30:00.000Z"},
//       "detectedAt": {"$date": "2026-01-31T00:00:00.000Z"},
//       "createdAt": {"$date": "2026-01-31T00:00:00.000Z"},
//       "updatedAt": {"$date": "2026-01-31T07:30:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d3000000000000000003"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "anomalyId": "ANOM-2026-003",
//       "type": "spike",
//       "metric": {
//         "name": "memory_utilization",
//         "type": "memory",
//         "unit": "percent"
//       },
//       "source": {
//         "service": "api-gateway",
//         "instance": "i-0abc123def456",
//         "resource": "ec2",
//         "region": "us-east-1"
//       },
//       "detection": {
//         "method": "ml",
//         "model": "isolation-forest",
//         "score": 0.89,
//         "confidence": 0.88,
//         "baseline": 52.1,
//         "observed": 88.3,
//         "deviation": 3.2
//       },
//       "severity": "high",
//       "status": "active",
//       "prediction": {
//         "isPredictive": false,
//         "predictedTime": null,
//         "predictedImpact": null,
//         "probability": null
//       },
//       "correlations": [
//         {
//           "anomalyId": "ANOM-2026-001",
//           "metric": "cpu_utilization",
//           "correlation": 0.87
//         }
//       ],
//       "timeline": [
//         {
//           "timestamp": {"$date": "2026-01-31T08:00:00.000Z"},
//           "value": 51.2
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T08:30:00.000Z"},
//           "value": 72.8
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T09:00:00.000Z"},
//           "value": 88.3
//         }
//       ],
//       "analysis": {
//         "llmInsights": "Memory usage spike correlates with CPU anomaly. Likely memory leak in application code causing both metrics to spike.",
//         "suggestedActions": [
//           "Collect heap dump for analysis",
//           "Review recent code changes",
//           "Consider restarting the service"
//         ],
//         "relatedPatterns": ["memory_leak_pattern"]
//       },
//       "relatedIncident": {"$oid": "697d2000000000000000001"},
//       "acknowledgedBy": {"$oid": "697cfece7c26f5527dbbb923"},
//       "acknowledgedAt": {"$date": "2026-01-31T09:10:00.000Z"},
//       "resolvedAt": null,
//       "detectedAt": {"$date": "2026-01-31T09:00:00.000Z"},
//       "createdAt": {"$date": "2026-01-31T09:00:00.000Z"},
//       "updatedAt": {"$date": "2026-01-31T09:10:00.000Z"}
//     }
//   ],

//   "logEntries": [
//     {
//       "_id": {"$oid": "697d4000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "timestamp": {"$date": "2026-01-31T09:00:15.234Z"},
//       "level": "error",
//       "message": "OutOfMemoryError: Java heap space",
//       "source": {
//         "service": "api-gateway",
//         "instance": "i-0abc123def456",
//         "pod": "api-gateway-7f9b8c5d4-x7k2m",
//         "container": "app",
//         "file": "RequestHandler.java",
//         "function": "handleRequest",
//         "line": 245
//       },
//       "metadata": {
//         "traceId": "abc123def456ghi789",
//         "spanId": "span-001",
//         "requestId": "req-12345",
//         "userId": "user-789",
//         "environment": "production",
//         "version": "v2.4.1"
//       },
//       "parsed": {
//         "errorType": "OutOfMemoryError",
//         "errorCode": "HEAP_SPACE",
//         "stackTrace": "java.lang.OutOfMemoryError: Java heap space\n  at RequestHandler.handleRequest(RequestHandler.java:245)\n  at Router.route(Router.java:89)",
//         "signature": "OutOfMemoryError_RequestHandler_245"
//       },
//       "analysis": {
//         "processed": true,
//         "processedAt": {"$date": "2026-01-31T09:01:00.000Z"},
//         "processedBy": "LogIntelligence",
//         "severity": "critical",
//         "category": "memory",
//         "patterns": ["oom_error", "heap_exhaustion"],
//         "llmInsights": "Critical memory issue in request handler. Repeated OOM errors suggest a memory leak. This is the 15th occurrence in the last hour.",
//         "confidence": 0.95
//       },
//       "relatedIncident": {"$oid": "697d2000000000000000001"},
//       "raw": "[2026-01-31T09:00:15.234Z] ERROR [api-gateway] OutOfMemoryError: Java heap space at RequestHandler.java:245",
//       "createdAt": {"$date": "2026-01-31T09:00:15.234Z"},
//       "updatedAt": {"$date": "2026-01-31T09:01:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d4000000000000000002"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "timestamp": {"$date": "2026-01-31T08:45:22.123Z"},
//       "level": "warn",
//       "message": "Connection pool size exceeded threshold (95/100 active)",
//       "source": {
//         "service": "user-service",
//         "instance": "i-0xyz789abc123",
//         "pod": "user-service-6d8a4b2c1-p9m3n",
//         "container": "app",
//         "file": "DatabasePool.java",
//         "function": "getConnection",
//         "line": 78
//       },
//       "metadata": {
//         "traceId": "xyz789abc123def456",
//         "environment": "production",
//         "version": "v1.8.2"
//       },
//       "parsed": {
//         "errorType": "ConnectionPoolWarning",
//         "errorCode": "POOL_THRESHOLD",
//         "stackTrace": null,
//         "signature": "ConnectionPool_Threshold_Warning"
//       },
//       "analysis": {
//         "processed": true,
//         "processedAt": {"$date": "2026-01-31T08:46:00.000Z"},
//         "processedBy": "LogIntelligence",
//         "severity": "medium",
//         "category": "database",
//         "patterns": ["connection_pool_exhaustion"],
//         "llmInsights": "Connection pool nearing capacity. May indicate connection leaks or increased load.",
//         "confidence": 0.82
//       },
//       "relatedIncident": null,
//       "raw": "[2026-01-31T08:45:22.123Z] WARN [user-service] Connection pool size exceeded threshold (95/100 active)",
//       "createdAt": {"$date": "2026-01-31T08:45:22.123Z"},
//       "updatedAt": {"$date": "2026-01-31T08:46:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d4000000000000000003"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "timestamp": {"$date": "2026-01-31T10:15:33.456Z"},
//       "level": "info",
//       "message": "Request processed successfully in 145ms",
//       "source": {
//         "service": "api-gateway",
//         "instance": "i-0abc123def456",
//         "pod": "api-gateway-7f9b8c5d4-x7k2m",
//         "container": "app",
//         "file": "RequestHandler.java",
//         "function": "handleRequest",
//         "line": 312
//       },
//       "metadata": {
//         "traceId": "trace-success-001",
//         "requestId": "req-67890",
//         "userId": "user-456",
//         "environment": "production",
//         "version": "v2.4.1"
//       },
//       "parsed": {
//         "errorType": null,
//         "errorCode": null,
//         "stackTrace": null,
//         "signature": null
//       },
//       "analysis": {
//         "processed": false,
//         "processedAt": null,
//         "processedBy": null,
//         "severity": null,
//         "category": null,
//         "patterns": [],
//         "llmInsights": null,
//         "confidence": null
//       },
//       "relatedIncident": null,
//       "raw": "[2026-01-31T10:15:33.456Z] INFO [api-gateway] Request processed successfully in 145ms",
//       "createdAt": {"$date": "2026-01-31T10:15:33.456Z"},
//       "updatedAt": {"$date": "2026-01-31T10:15:33.456Z"}
//     }
//   ],

//   "resources": [
//     {
//       "_id": {"$oid": "697d5000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "resourceId": "i-0abc123def456",
//       "type": "ec2",
//       "name": "api-gateway-prod-1",
//       "region": "us-east-1",
//       "status": "running",
//       "metadata": {
//         "instanceType": "t3.large",
//         "az": "us-east-1a",
//         "vpc": "vpc-12345",
//         "subnet": "subnet-67890",
//         "securityGroups": ["sg-web", "sg-internal"],
//         "tags": {
//           "Environment": "production",
//           "Service": "api-gateway",
//           "Team": "platform"
//         },
//         "launchTime": {"$date": "2026-01-15T10:00:00.000Z"},
//         "platform": "Linux",
//         "architecture": "x86_64"
//       },
//       "metrics": {
//         "cpu": {
//           "current": 92.8,
//           "avg": 45.2,
//           "max": 95.3,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         },
//         "memory": {
//           "current": 88.3,
//           "avg": 52.1,
//           "max": 89.7,
//           "used": 7065,
//           "total": 8000,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         },
//         "disk": {
//           "used": 45,
//           "total": 100,
//           "readOps": 1234,
//           "writeOps": 567,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         },
//         "network": {
//           "bytesIn": 1234567890,
//           "bytesOut": 9876543210,
//           "packetsIn": 123456,
//           "packetsOut": 234567,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         }
//       },
//       "health": {
//         "status": "degraded",
//         "lastCheck": {"$date": "2026-01-31T10:25:00.000Z"},
//         "checks": [
//           {
//             "name": "cpu_usage",
//             "status": "failing",
//             "message": "CPU usage above 90%",
//             "lastChecked": {"$date": "2026-01-31T10:25:00.000Z"}
//           },
//           {
//             "name": "memory_usage",
//             "status": "warning",
//             "message": "Memory usage above 85%",
//             "lastChecked": {"$date": "2026-01-31T10:25:00.000Z"}
//           },
//           {
//             "name": "disk_usage",
//             "status": "passing",
//             "message": "Disk usage normal",
//             "lastChecked": {"$date": "2026-01-31T10:25:00.000Z"}
//           }
//         ]
//       },
//       "costs": {
//         "hourly": 0.0832,
//         "daily": 1.9968,
//         "monthly": 59.904,
//         "currency": "USD",
//         "lastCalculated": {"$date": "2026-01-31T00:00:00.000Z"}
//       },
//       "optimization": {
//         "recommendations": [
//           {
//             "type": "rightsizing",
//             "description": "Instance is underutilized (avg 45% CPU). Consider downsizing to t3.medium",
//             "estimatedSavings": 25.50,
//             "priority": "medium",
//             "createdAt": {"$date": "2026-01-30T00:00:00.000Z"}
//           }
//         ],
//         "utilizationScore": 45,
//         "rightSizingRecommendation": "t3.medium"
//       },
//       "lastSyncAt": {"$date": "2026-01-31T10:25:00.000Z"},
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T10:25:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d5000000000000000002"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "resourceId": "rds-postgres-prod",
//       "type": "rds",
//       "name": "main-database",
//       "region": "us-east-1",
//       "status": "running",
//       "metadata": {
//         "instanceType": "db.t3.medium",
//         "az": "us-east-1b",
//         "vpc": "vpc-12345",
//         "securityGroups": ["sg-database"],
//         "tags": {
//           "Environment": "production",
//           "Service": "database",
//           "Team": "platform"
//         },
//         "platform": "PostgreSQL 14.5"
//       },
//       "metrics": {
//         "cpu": {
//           "current": 23.5,
//           "avg": 18.2,
//           "max": 45.8,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         },
//         "memory": {
//           "current": 67.3,
//           "avg": 62.1,
//           "max": 78.2,
//           "used": 2692,
//           "total": 4000,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         },
//         "disk": {
//           "used": 128,
//           "total": 500,
//           "readOps": 5678,
//           "writeOps": 2345,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         },
//         "network": {
//           "bytesIn": 987654321,
//           "bytesOut": 654321987,
//           "packetsIn": 98765,
//           "packetsOut": 87654,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         }
//       },
//       "health": {
//         "status": "healthy",
//         "lastCheck": {"$date": "2026-01-31T10:25:00.000Z"},
//         "checks": [
//           {
//             "name": "database_connections",
//             "status": "passing",
//             "message": "Connection count normal (75/100)",
//             "lastChecked": {"$date": "2026-01-31T10:25:00.000Z"}
//           },
//           {
//             "name": "replication_lag",
//             "status": "passing",
//             "message": "Replication lag < 1s",
//             "lastChecked": {"$date": "2026-01-31T10:25:00.000Z"}
//           }
//         ]
//       },
//       "costs": {
//         "hourly": 0.068,
//         "daily": 1.632,
//         "monthly": 48.96,
//         "currency": "USD",
//         "lastCalculated": {"$date": "2026-01-31T00:00:00.000Z"}
//       },
//       "optimization": {
//         "recommendations": [],
//         "utilizationScore": 72,
//         "rightSizingRecommendation": null
//       },
//       "lastSyncAt": {"$date": "2026-01-31T10:25:00.000Z"},
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T10:25:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d5000000000000000003"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "resourceId": "i-0def456ghi789",
//       "type": "ec2",
//       "name": "log-processor-1",
//       "region": "us-east-1",
//       "status": "running",
//       "metadata": {
//         "instanceType": "t3.medium",
//         "az": "us-east-1c",
//         "vpc": "vpc-12345",
//         "subnet": "subnet-11111",
//         "securityGroups": ["sg-internal"],
//         "tags": {
//           "Environment": "production",
//           "Service": "log-processor",
//           "Team": "platform"
//         },
//         "launchTime": {"$date": "2026-01-20T08:00:00.000Z"},
//         "platform": "Linux",
//         "architecture": "x86_64"
//       },
//       "metrics": {
//         "cpu": {
//           "current": 15.2,
//           "avg": 12.5,
//           "max": 28.3,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         },
//         "memory": {
//           "current": 45.8,
//           "avg": 42.3,
//           "max": 56.2,
//           "used": 1832,
//           "total": 4000,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         },
//         "disk": {
//           "used": 94.5,
//           "total": 100,
//           "readOps": 234,
//           "writeOps": 5678,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         },
//         "network": {
//           "bytesIn": 123456789,
//           "bytesOut": 456789123,
//           "packetsIn": 12345,
//           "packetsOut": 23456,
//           "lastUpdated": {"$date": "2026-01-31T10:25:00.000Z"}
//         }
//       },
//       "health": {
//         "status": "degraded",
//         "lastCheck": {"$date": "2026-01-31T10:25:00.000Z"},
//         "checks": [
//           {
//             "name": "disk_usage",
//             "status": "warning",
//             "message": "Disk usage above 90%",
//             "lastChecked": {"$date": "2026-01-31T10:25:00.000Z"}
//           }
//         ]
//       },
//       "costs": {
//         "hourly": 0.0416,
//         "daily": 0.9984,
//         "monthly": 29.952,
//         "currency": "USD",
//         "lastCalculated": {"$date": "2026-01-31T00:00:00.000Z"}
//       },
//       "optimization": {
//         "recommendations": [
//           {
//             "type": "storage",
//             "description": "Disk usage critical. Clean up old logs or increase volume size",
//             "estimatedSavings": 0,
//             "priority": "high",
//             "createdAt": {"$date": "2026-01-31T00:00:00.000Z"}
//           }
//         ],
//         "utilizationScore": 35,
//         "rightSizingRecommendation": "t3.small"
//       },
//       "lastSyncAt": {"$date": "2026-01-31T10:25:00.000Z"},
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T10:25:00.000Z"}
//     }
//   ],

//   "recommendations": [
//     {
//       "_id": {"$oid": "697d6000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "recommendationId": "REC-2026-001",
//       "type": "performance",
//       "category": "infrastructure",
//       "title": "Increase Heap Memory for API Gateway",
//       "description": "Based on recurring OutOfMemoryErrors and analysis of heap dumps, the API Gateway service requires additional heap memory allocation. Current heap size (2GB) is insufficient for current request volume.",
//       "priority": "high",
//       "status": "pending",
//       "source": {
//         "agent": "Recommendation",
//         "incident": {"$oid": "697d2000000000000000001"},
//         "anomaly": {"$oid": "697d3000000000000000003"},
//         "analysis": {
//           "currentHeapSize": "2GB",
//           "recommendedHeapSize": "4GB",
//           "errorFrequency": "15 OOMs per hour"
//         }
//       },
//       "impact": {
//         "estimated": "Eliminate OOM errors, reduce CPU overhead from GC, improve response times by ~30%",
//         "area": ["api-gateway", "dependent-services"],
//         "risk": "low"
//       },
//       "implementation": {
//         "difficulty": "easy",
//         "estimatedTime": "15 minutes",
//         "steps": [
//           "Update JVM configuration in deployment manifest",
//           "Set -Xmx4g -Xms4g in JAVA_OPTS",
//           "Perform rolling restart of API Gateway pods",
//           "Monitor heap usage and GC metrics for 1 hour"
//         ],
//         "resources": ["Kubernetes deployment", "JVM configuration"],
//         "automatable": true
//       },
//       "metrics": {
//         "estimatedSavings": 0,
//         "estimatedPerformanceGain": 30,
//         "currency": "USD"
//       },
//       "feedback": {
//         "helpful": null,
//         "rating": null,
//         "comment": null,
//         "respondedBy": null,
//         "respondedAt": null
//       },
//       "expiresAt": {"$date": "2026-02-07T00:00:00.000Z"},
//       "createdAt": {"$date": "2026-01-31T09:50:00.000Z"},
//       "updatedAt": {"$date": "2026-01-31T09:50:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d6000000000000000002"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "recommendationId": "REC-2026-002",
//       "type": "cost",
//       "category": "infrastructure",
//       "title": "Rightsize API Gateway Instance",
//       "description": "The API Gateway EC2 instance (t3.large) is consistently underutilized with average CPU at 45% and memory at 52%. Downsizing to t3.medium would maintain performance while reducing costs.",
//       "priority": "medium",
//       "status": "deferred",
//       "source": {
//         "agent": "Recommendation",
//         "incident": null,
//         "anomaly": null,
//         "analysis": {
//           "currentInstanceType": "t3.large",
//           "recommendedInstanceType": "t3.medium",
//           "avgCpuUtilization": 45,
//           "avgMemoryUtilization": 52
//         }
//       },
//       "impact": {
//         "estimated": "42% cost reduction with minimal performance impact",
//         "area": ["api-gateway"],
//         "risk": "medium"
//       },
//       "implementation": {
//         "difficulty": "medium",
//         "estimatedTime": "30 minutes",
//         "steps": [
//           "Create new t3.medium instance",
//           "Update load balancer to include new instance",
//           "Gradually shift traffic to new instance",
//           "Monitor performance for 24 hours",
//           "Terminate old instance if performance is acceptable"
//         ],
//         "resources": ["EC2", "Load Balancer"],
//         "automatable": false
//       },
//       "metrics": {
//         "estimatedSavings": 25.50,
//         "estimatedPerformanceGain": 0,
//         "currency": "USD"
//       },
//       "feedback": {
//         "helpful": true,
//         "rating": 4,
//         "comment": "Good recommendation but deferred until after memory issue is resolved",
//         "respondedBy": {"$oid": "697cfece7c26f5527dbbb923"},
//         "respondedAt": {"$date": "2026-01-31T10:00:00.000Z"}
//       },
//       "expiresAt": {"$date": "2026-02-14T00:00:00.000Z"},
//       "createdAt": {"$date": "2026-01-30T00:00:00.000Z"},
//       "updatedAt": {"$date": "2026-01-31T10:00:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d6000000000000000003"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "recommendationId": "REC-2026-003",
//       "type": "prevention",
//       "category": "process",
//       "title": "Implement Automated Log Rotation",
//       "description": "Log processor instance disk usage reached 94.5% due to lack of proper log rotation. Implement automated log rotation and archival to prevent future disk space issues.",
//       "priority": "high",
//       "status": "accepted",
//       "source": {
//         "agent": "Recommendation",
//         "incident": null,
//         "anomaly": {"$oid": "697d3000000000000000002"},
//         "analysis": {
//           "currentLogSize": "94.5GB",
//           "logGrowthRate": "~3GB per day",
//           "projectedFullDisk": "2026-02-02"
//         }
//       },
//       "impact": {
//         "estimated": "Prevent disk full incidents, reduce storage costs",
//         "area": ["log-processor", "monitoring"],
//         "risk": "low"
//       },
//       "implementation": {
//         "difficulty": "easy",
//         "estimatedTime": "20 minutes",
//         "steps": [
//           "Configure logrotate for application logs",
//           "Set rotation policy: daily, keep 7 days",
//           "Configure compression for rotated logs",
//           "Set up S3 archival for logs older than 7 days",
//           "Add monitoring for disk space"
//         ],
//         "resources": ["Log configuration", "S3 bucket"],
//         "automatable": true
//       },
//       "metrics": {
//         "estimatedSavings": 15.00,
//         "estimatedPerformanceGain": 0,
//         "currency": "USD"
//       },
//       "feedback": {
//         "helpful": true,
//         "rating": 5,
//         "comment": "Excellent recommendation, implementing immediately",
//         "respondedBy": {"$oid": "697cfece7c26f5527dbbb923"},
//         "respondedAt": {"$date": "2026-01-31T06:30:00.000Z"}
//       },
//       "expiresAt": {"$date": "2026-02-07T00:00:00.000Z"},
//       "createdAt": {"$date": "2026-01-31T06:00:00.000Z"},
//       "updatedAt": {"$date": "2026-01-31T06:30:00.000Z"}
//     }
//   ],

//   "recoveries": [
//     {
//       "_id": {"$oid": "697d7000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "recoveryId": "REC-ACT-2026-001",
//       "incident": {"$oid": "697d2000000000000000002"},
//       "type": "restart",
//       "action": {
//         "name": "Restart User Service Pods",
//         "description": "Restart all user-service pods to clear connection pool",
//         "command": "kubectl rollout restart deployment/user-service -n production",
//         "parameters": {
//           "deployment": "user-service",
//           "namespace": "production"
//         }
//       },
//       "target": {
//         "type": "deployment",
//         "name": "user-service",
//         "resourceId": "deployment/user-service",
//         "namespace": "production"
//       },
//       "status": "completed",
//       "riskLevel": 3,
//       "approval": {
//         "required": true,
//         "approvedBy": {"$oid": "697cfece7c26f5527dbbb923"},
//         "approvedAt": {"$date": "2026-01-30T15:35:00.000Z"},
//         "autoApproved": false,
//         "reason": "Critical incident - connection pool exhausted"
//       },
//       "execution": {
//         "startedAt": {"$date": "2026-01-30T15:35:00.000Z"},
//         "completedAt": {"$date": "2026-01-30T15:42:00.000Z"},
//         "duration": 420000,
//         "retryCount": 0,
//         "maxRetries": 3
//       },
//       "snapshot": {
//         "taken": true,
//         "id": "snap-user-service-20260130",
//         "data": {
//           "replicas": 3,
//           "imageVersion": "v1.8.2"
//         },
//         "createdAt": {"$date": "2026-01-30T15:35:00.000Z"}
//       },
//       "rollback": {
//         "performed": false,
//         "reason": null,
//         "performedAt": null,
//         "success": null
//       },
//       "healthCheck": {
//         "performed": true,
//         "passed": true,
//         "checkedAt": {"$date": "2026-01-30T15:44:00.000Z"},
//         "results": {
//           "allPodsRunning": true,
//           "connectionPoolNormal": true,
//           "requestSuccessRate": 99.8
//         }
//       },
//       "result": {
//         "success": true,
//         "message": "All pods restarted successfully. Connection pool cleared. Service healthy.",
//         "data": {
//           "podsRestarted": 3,
//           "downtime": "0s",
//           "connectionPoolSize": "25/100"
//         },
//         "error": null
//       },
//       "triggeredBy": {
//         "type": "user",
//         "agentName": null,
//         "userId": {"$oid": "697cfece7c26f5527dbbb923"},
//         "workflowId": null
//       },
//       "logs": [
//         {
//           "timestamp": {"$date": "2026-01-30T15:35:00.000Z"},
//           "level": "info",
//           "message": "Taking snapshot before restart"
//         },
//         {
//           "timestamp": {"$date": "2026-01-30T15:35:30.000Z"},
//           "level": "info",
//           "message": "Initiating rolling restart"
//         },
//         {
//           "timestamp": {"$date": "2026-01-30T15:42:00.000Z"},
//           "level": "info",
//           "message": "All pods restarted successfully"
//         },
//         {
//           "timestamp": {"$date": "2026-01-30T15:44:00.000Z"},
//           "level": "info",
//           "message": "Health check passed"
//         }
//       ],
//       "createdAt": {"$date": "2026-01-30T15:30:00.000Z"},
//       "updatedAt": {"$date": "2026-01-30T15:44:00.000Z"}
//     }
//   ],

//   "costAnalyses": [
//     {
//       "_id": {"$oid": "697d8000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "period": {
//         "start": {"$date": "2026-01-01T00:00:00.000Z"},
//         "end": {"$date": "2026-01-31T23:59:59.999Z"},
//         "type": "monthly"
//       },
//       "summary": {
//         "totalCost": 1247.52,
//         "previousPeriodCost": 1189.34,
//         "percentChange": 4.89,
//         "currency": "USD",
//         "projectedMonthly": 1247.52
//       },
//       "breakdown": {
//         "byService": [
//           {
//             "service": "EC2",
//             "cost": 547.82,
//             "percentage": 43.9,
//             "change": 8.2
//           },
//           {
//             "service": "RDS",
//             "cost": 342.18,
//             "percentage": 27.4,
//             "change": 2.1
//           },
//           {
//             "service": "ECS",
//             "cost": 198.45,
//             "percentage": 15.9,
//             "change": 1.5
//           },
//           {
//             "service": "S3",
//             "cost": 89.23,
//             "percentage": 7.2,
//             "change": 12.4
//           },
//           {
//             "service": "CloudWatch",
//             "cost": 45.67,
//             "percentage": 3.7,
//             "change": -2.3
//           },
//           {
//             "service": "Other",
//             "cost": 24.17,
//             "percentage": 1.9,
//             "change": 5.8
//           }
//         ],
//         "byRegion": [
//           {
//             "region": "us-east-1",
//             "cost": 1089.42,
//             "percentage": 87.3
//           },
//           {
//             "region": "us-west-2",
//             "cost": 158.10,
//             "percentage": 12.7
//           }
//         ],
//         "byResourceType": [
//           {
//             "type": "Compute",
//             "cost": 746.27,
//             "count": 8,
//             "percentage": 59.8
//           },
//           {
//             "type": "Database",
//             "cost": 342.18,
//             "count": 2,
//             "percentage": 27.4
//           },
//           {
//             "type": "Storage",
//             "cost": 89.23,
//             "count": 15,
//             "percentage": 7.2
//           },
//           {
//             "type": "Monitoring",
//             "cost": 45.67,
//             "count": 1,
//             "percentage": 3.7
//           },
//           {
//             "type": "Networking",
//             "cost": 24.17,
//             "count": 3,
//             "percentage": 1.9
//           }
//         ]
//       },
//       "topResources": [
//         {
//           "resourceId": "i-0abc123def456",
//           "name": "api-gateway-prod-1",
//           "type": "EC2",
//           "cost": 59.90,
//           "utilization": 45,
//           "recommendation": "Downsize to t3.medium for $25.50/month savings"
//         },
//         {
//           "resourceId": "rds-postgres-prod",
//           "name": "main-database",
//           "type": "RDS",
//           "cost": 48.96,
//           "utilization": 72,
//           "recommendation": "Well-sized, no changes recommended"
//         },
//         {
//           "resourceId": "i-0xyz789abc123",
//           "name": "worker-pool-1",
//           "type": "EC2",
//           "cost": 45.23,
//           "utilization": 82,
//           "recommendation": "Well-utilized, consider reserved instance for savings"
//         }
//       ],
//       "waste": {
//         "total": 178.45,
//         "categories": [
//           {
//             "type": "underutilized",
//             "amount": 89.23,
//             "resources": 3,
//             "description": "Resources with <50% average utilization"
//           },
//           {
//             "type": "idle",
//             "amount": 56.78,
//             "resources": 2,
//             "description": "Resources with no activity in 7+ days"
//           },
//           {
//             "type": "oversized",
//             "amount": 32.44,
//             "resources": 2,
//             "description": "Resources larger than needed for workload"
//           }
//         ]
//       },
//       "savings": {
//         "potential": 145.67,
//         "implemented": 0,
//         "recommendations": [
//           {
//             "type": "rightsizing",
//             "description": "Downsize 3 underutilized EC2 instances",
//             "estimatedSavings": 67.50,
//             "priority": "high"
//           },
//           {
//             "type": "reserved_instances",
//             "description": "Purchase 1-year reserved instances for stable workloads",
//             "estimatedSavings": 48.92,
//             "priority": "medium"
//           },
//           {
//             "type": "storage_optimization",
//             "description": "Move infrequently accessed S3 data to Glacier",
//             "estimatedSavings": 29.25,
//             "priority": "low"
//           }
//         ]
//       },
//       "budgets": [
//         {
//           "name": "Monthly Cloud Budget",
//           "allocated": 1500.00,
//           "used": 1247.52,
//           "remaining": 252.48,
//           "percentUsed": 83.17,
//           "forecast": 1247.52,
//           "status": "on_track"
//         }
//       ],
//       "trends": {
//         "daily": [
//           {
//             "date": {"$date": "2026-01-29T00:00:00.000Z"},
//             "cost": 40.24
//           },
//           {
//             "date": {"$date": "2026-01-30T00:00:00.000Z"},
//             "cost": 41.15
//           },
//           {
//             "date": {"$date": "2026-01-31T00:00:00.000Z"},
//             "cost": 39.87
//           }
//         ],
//         "serviceGrowth": [
//           {
//             "service": "EC2",
//             "trend": "increasing",
//             "rate": 8.2
//           },
//           {
//             "service": "S3",
//             "trend": "increasing",
//             "rate": 12.4
//           },
//           {
//             "service": "RDS",
//             "trend": "stable",
//             "rate": 2.1
//           }
//         ]
//       },
//       "analysis": {
//         "llmInsights": "Overall cloud spend increased 4.89% compared to last month, primarily driven by EC2 (8.2% growth) and S3 (12.4% growth). Significant savings opportunity exists through rightsizing underutilized instances ($67.50/month) and implementing reserved instances for stable workloads ($48.92/month). Total waste identified: $178.45, representing 14.3% of monthly spend.",
//         "anomalies": [
//           "S3 costs increased 12.4% - investigate data growth patterns",
//           "2 idle EC2 instances detected - consider terminating"
//         ],
//         "opportunities": [
//           "Implement automated instance scheduling for dev/test environments",
//           "Review S3 lifecycle policies to move old data to cheaper tiers",
//           "Consider Savings Plans for predictable compute usage"
//         ]
//       },
//       "generatedBy": "CostOptimization",
//       "createdAt": {"$date": "2026-01-31T00:00:00.000Z"},
//       "updatedAt": {"$date": "2026-01-31T00:00:00.000Z"}
//     }
//   ],

//   "workflows": [
//     {
//       "_id": {"$oid": "697d9000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "name": "Crash Investigation Workflow",
//       "description": "Automated workflow to investigate application crashes",
//       "type": "diagnostic",
//       "trigger": {
//         "type": "event",
//         "schedule": null,
//         "event": "crash_detected",
//         "condition": null
//       },
//       "steps": [
//         {
//           "order": 1,
//           "agent": "CrashDiagnostic",
//           "action": "analyze_crash",
//           "description": "Analyze crash logs and stack traces",
//           "condition": null,
//           "timeout": 45000,
//           "retryOnFail": true,
//           "continueOnError": false,
//           "inputMapping": {},
//           "outputMapping": {}
//         },
//         {
//           "order": 2,
//           "agent": "LogIntelligence",
//           "action": "find_related_logs",
//           "description": "Find related log entries before crash",
//           "condition": null,
//           "timeout": 30000,
//           "retryOnFail": true,
//           "continueOnError": false,
//           "inputMapping": {},
//           "outputMapping": {}
//         },
//         {
//           "order": 3,
//           "agent": "Recommendation",
//           "action": "generate_recommendations",
//           "description": "Generate recommendations to prevent future crashes",
//           "condition": null,
//           "timeout": 40000,
//           "retryOnFail": true,
//           "continueOnError": true,
//           "inputMapping": {},
//           "outputMapping": {}
//         }
//       ],
//       "isActive": true,
//       "isSystem": true,
//       "version": 1,
//       "tags": ["crash", "diagnostic", "automated"],
//       "metrics": {
//         "executionCount": 23,
//         "successCount": 21,
//         "failureCount": 2,
//         "averageDuration": 78000,
//         "lastExecution": {"$date": "2026-01-31T09:00:00.000Z"}
//       },
//       "createdBy": null,
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T09:00:00.000Z"}
//     },
//     {
//       "_id": {"$oid": "697d9000000000000000002"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "name": "Resource Optimization Check",
//       "description": "Daily check for resource optimization opportunities",
//       "type": "optimization",
//       "trigger": {
//         "type": "scheduled",
//         "schedule": "0 2 * * *",
//         "event": null,
//         "condition": null
//       },
//       "steps": [
//         {
//           "order": 1,
//           "agent": "ResourceOptimization",
//           "action": "analyze_resources",
//           "description": "Analyze all cloud resources for optimization",
//           "condition": null,
//           "timeout": 60000,
//           "retryOnFail": true,
//           "continueOnError": false,
//           "inputMapping": {},
//           "outputMapping": {}
//         },
//         {
//           "order": 2,
//           "agent": "CostOptimization",
//           "action": "generate_cost_analysis",
//           "description": "Generate cost analysis report",
//           "condition": null,
//           "timeout": 90000,
//           "retryOnFail": true,
//           "continueOnError": true,
//           "inputMapping": {},
//           "outputMapping": {}
//         },
//         {
//           "order": 3,
//           "agent": "Recommendation",
//           "action": "create_recommendations",
//           "description": "Create recommendations based on findings",
//           "condition": null,
//           "timeout": 40000,
//           "retryOnFail": true,
//           "continueOnError": true,
//           "inputMapping": {},
//           "outputMapping": {}
//         }
//       ],
//       "isActive": true,
//       "isSystem": false,
//       "version": 1,
//       "tags": ["optimization", "cost", "scheduled"],
//       "metrics": {
//         "executionCount": 31,
//         "successCount": 31,
//         "failureCount": 0,
//         "averageDuration": 145000,
//         "lastExecution": {"$date": "2026-01-31T02:00:00.000Z"}
//       },
//       "createdBy": {"$oid": "697cfece7c26f5527dbbb923"},
//       "createdAt": {"$date": "2026-01-30T18:56:14.000Z"},
//       "updatedAt": {"$date": "2026-01-31T02:00:00.000Z"}
//     }
//   ],

//   "workflowExecutions": [
//     {
//       "_id": {"$oid": "697da000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "workflow": {"$oid": "697d9000000000000000001"},
//       "workflowName": "Crash Investigation Workflow",
//       "workflowVersion": 1,
//       "status": "completed",
//       "triggeredBy": {
//         "type": "event",
//         "userId": null,
//         "agentName": "CrashDiagnostic",
//         "eventName": "crash_detected"
//       },
//       "startTime": {"$date": "2026-01-31T09:00:00.000Z"},
//       "endTime": {"$date": "2026-01-31T09:01:23.456Z"},
//       "duration": 83456,
//       "currentStep": 3,
//       "totalSteps": 3,
//       "steps": [
//         {
//           "stepOrder": 1,
//           "agent": "CrashDiagnostic",
//           "action": "analyze_crash",
//           "status": "completed",
//           "startTime": {"$date": "2026-01-31T09:00:00.000Z"},
//           "endTime": {"$date": "2026-01-31T09:00:35.123Z"},
//           "duration": 35123,
//           "input": {
//             "crashId": "crash-001",
//             "service": "api-gateway"
//           },
//           "output": {
//             "rootCause": "OutOfMemoryError",
//             "confidence": 0.95,
//             "stackTrace": "java.lang.OutOfMemoryError..."
//           },
//           "error": null,
//           "retryCount": 0
//         },
//         {
//           "stepOrder": 2,
//           "agent": "LogIntelligence",
//           "action": "find_related_logs",
//           "status": "completed",
//           "startTime": {"$date": "2026-01-31T09:00:35.123Z"},
//           "endTime": {"$date": "2026-01-31T09:00:58.234Z"},
//           "duration": 23111,
//           "input": {
//             "service": "api-gateway",
//             "timeWindow": "30m"
//           },
//           "output": {
//             "logsFound": 1247,
//             "errorCount": 23,
//             "patterns": ["memory_leak", "gc_overhead"]
//           },
//           "error": null,
//           "retryCount": 0
//         },
//         {
//           "stepOrder": 3,
//           "agent": "Recommendation",
//           "action": "generate_recommendations",
//           "status": "completed",
//           "startTime": {"$date": "2026-01-31T09:00:58.234Z"},
//           "endTime": {"$date": "2026-01-31T09:01:23.456Z"},
//           "duration": 25222,
//           "input": {
//             "analysisResults": {
//               "rootCause": "OutOfMemoryError",
//               "patterns": ["memory_leak", "gc_overhead"]
//             }
//           },
//           "output": {
//             "recommendationsCreated": 1,
//             "recommendationId": "REC-2026-001"
//           },
//           "error": null,
//           "retryCount": 0
//         }
//       ],
//       "initialData": {
//         "crashId": "crash-001",
//         "service": "api-gateway",
//         "timestamp": "2026-01-31T09:00:00.000Z"
//       },
//       "finalResult": {
//         "success": true,
//         "incidentCreated": "INC-2026-001",
//         "recommendationsCreated": 1
//       },
//       "context": {
//         "crashId": "crash-001",
//         "service": "api-gateway",
//         "rootCause": "OutOfMemoryError"
//       },
//       "logs": [
//         {
//           "timestamp": {"$date": "2026-01-31T09:00:00.000Z"},
//           "level": "info",
//           "message": "Workflow execution started",
//           "metadata": null
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T09:00:35.123Z"},
//           "level": "info",
//           "message": "Step 1 completed: Crash analysis done",
//           "metadata": {"rootCause": "OutOfMemoryError"}
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T09:00:58.234Z"},
//           "level": "info",
//           "message": "Step 2 completed: Related logs found",
//           "metadata": {"logsFound": 1247}
//         },
//         {
//           "timestamp": {"$date": "2026-01-31T09:01:23.456Z"},
//           "level": "info",
//           "message": "Workflow execution completed successfully",
//           "metadata": null
//         }
//       ],
//       "relatedIncidents": [{"$oid": "697d2000000000000000001"}],
//       "createdAt": {"$date": "2026-01-31T09:00:00.000Z"},
//       "updatedAt": {"$date": "2026-01-31T09:01:23.456Z"}
//     }
//   ],

//   "messages": [
//     {
//       "_id": {"$oid": "697db000000000000000001"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "from": "AnomalyDetection",
//       "to": "LogIntelligence",
//       "type": "collaboration",
//       "category": "anomaly",
//       "payload": {
//         "query": "Check logs for service api-gateway between 08:30 and 09:00",
//         "anomalyId": "ANOM-2026-001",
//         "context": {
//           "metric": "cpu_utilization",
//           "value": 92.8,
//           "service": "api-gateway"
//         }
//       },
//       "priority": 4,
//       "status": "processed",
//       "replyTo": null,
//       "correlationId": "corr-001",
//       "workflowExecutionId": null,
//       "metadata": {
//         "processingTime": 2345,
//         "retryCount": 0,
//         "deliveredAt": {"$date": "2026-01-31T10:15:00.100Z"},
//         "processedAt": {"$date": "2026-01-31T10:15:02.445Z"}
//       },
//       "expiresAt": {"$date": "2026-02-01T10:15:00.000Z"},
//       "createdAt": {"$date": "2026-01-31T10:15:00.000Z"},
//       "updatedAt": {"$date": "2026-01-31T10:15:02.445Z"}
//     },
//     {
//       "_id": {"$oid": "697db000000000000000002"},
//       "company": {"$oid": "697cfecd7c26f5527dbbb921"},
//       "from": "LogIntelligence",
//       "to": "AnomalyDetection",
//       "type": "response",
//       "category": "log_analysis",
//       "payload": {
//         "logCount": 1247,
//         "errorCount": 23,
//         "patterns": ["oom_error", "heap_exhaustion"],
//         "insights": "Found 15 OutOfMemoryError occurrences in the specified time window"
//       },
//       "priority": 4,
//       "status": "delivered",
//       "replyTo": {"$oid": "697db000000000000000001"},
//       "correlationId": "corr-001",
//       "workflowExecutionId": null,
//       "metadata": {
//         "processingTime": 1823,
//         "retryCount": 0,
//         "deliveredAt": {"$date": "2026-01-31T10:15:04.268Z"},
//         "processedAt": null
//       },
//       "expiresAt": {"$date": "2026-02-01T10:15:02.445Z"},
//       "createdAt": {"$date": "2026-01-31T10:15:02.445Z"},
//       "updatedAt": {"$date": "2026-01-31T10:15:04.268Z"}
//     }
//   ]
// }