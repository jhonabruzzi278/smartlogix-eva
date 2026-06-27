# AWS Academy (voclabs) does not allow servicediscovery:CreatePrivateDnsNamespace.
# Service discovery is handled by running all containers in a single ECS task,
# where they communicate via localhost (shared network namespace in awsvpc mode).
