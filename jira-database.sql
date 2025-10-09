model BTSIssue {
  id                   String             @id @default(cuid())
  key                  String
  self                 String
  summary              String?
  statusId             String?
  projectId            String?
  assigneeId           String?
  reporterId           String?
  fixVersionId         String?
  created              DateTime
  updated              DateTime
  timeEstimate         Int?
  timeOriginalEstimate Int?
  labels               String[]
  fixVersions          String[]
  customFields         Json
  changelog            BTSChangelog[]
  components           BTSComponent[]
  assignee             BTSUser?           @relation("Assignee", fields: [assigneeId], references: [id])
  fixVersion           BTSFixVersion?     @relation(fields: [fixVersionId], references: [id])
  project              BTSProject?        @relation(fields: [projectId], references: [id])
  reporter             BTSUser?           @relation("Reporter", fields: [reporterId], references: [id])
  status               BTSStatus?         @relation(fields: [statusId], references: [id])
  subtasks             BTSSubtask[]
  resolvedDate         DateTime           @default(now())
  SnapshotBTSIssue     SnapshotBTSIssue[]
  @@map("bts_issues")
}

model SnapshotBTSIssue {
  id                   Int      @id @default(autoincrement())
  issueId              String
  snapshotDate         DateTime
  key                  String
  self                 String
  summary              String?
  statusId             String?
  projectId            String?
  assigneeId           String?
  reporterId           String?
  fixVersionId         String?
  created              DateTime
  updated              DateTime
  timeEstimate         Int?
  timeOriginalEstimate Int?
  labels               String[]
  fixVersions          String[]
  customFields         Json
  resolvedDate         DateTime @default(now())
  btsIssue             BTSIssue @relation(fields: [issueId], references: [id])
  @@index([snapshotDate, issueId])
  @@map("bts_snapshot_issues")
}

model BTSUser {
  id             String         @id @default(cuid())
  userId         String
  user           Employees      @relation(fields: [userId], references: [id])
  BTSChangelog   BTSChangelog[]
  assigneeIssues BTSIssue[]     @relation("Assignee")
  reporterIssues BTSIssue[]     @relation("Reporter")
  @@map("bts_users")
}

model BTSProject {
  id         String          @id @unique
  key        String
  name       String
  self       String
  fixVersion BTSFixVersion[]
  issues     BTSIssue[]
  ttsService TTSService[]
  @@map("bts_projects")
}

model BTSStatus {
  id             String     @id @unique
  name           String
  statusCategory Json
  issues         BTSIssue[]
  @@map("bts_statuses")
}

model BTSComponent {
  id      String   @id @unique
  name    String
  self    String
  issueId String
  issue   BTSIssue @relation(fields: [issueId], references: [id])
  @@map("bts_components")
}

model BTSChangelog {
  id       String   @id @unique
  issueId  String
  created  DateTime
  authorId String
  items    Json
  author   BTSUser  @relation(fields: [authorId], references: [id])
  issue    BTSIssue @relation(fields: [issueId], references: [id])
  @@map("bts_changelogs")
}

model BTSSubtask {
  id      String   @id @unique
  name    String
  self    String
  issueId String
  issue   BTSIssue @relation(fields: [issueId], references: [id])
  @@map("bts_subtasks")
}

model BTSFixVersion {
  id          String     @id @unique
  self        String
  name        String
  description String
  archived    Boolean
  released    Boolean
  releaseDate DateTime?
  projectId   String
  project     BTSProject @relation(fields: [projectId], references: [id])
  issues      BTSIssue[]
  @@map("fixVersions")
}
