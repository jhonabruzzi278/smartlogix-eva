resource "aws_efs_file_system" "postgres" {
  encrypted = true
  tags      = { Name = "${var.project_name}-postgres-data" }
}

resource "aws_efs_mount_target" "postgres" {
  count           = 2
  file_system_id  = aws_efs_file_system.postgres.id
  subnet_id       = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_access_point" "postgres" {
  file_system_id = aws_efs_file_system.postgres.id

  posix_user {
    gid = 999
    uid = 999
  }

  root_directory {
    path = "/pgdata"
    creation_info {
      owner_gid   = 999
      owner_uid   = 999
      permissions = "755"
    }
  }

  tags = { Name = "${var.project_name}-postgres-ap" }
}
