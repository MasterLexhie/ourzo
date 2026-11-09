export type ProjectStatus = 'planned' | 'in_progress' | 'paused' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
// export type UsageResource = 'members' | 'projects' | 'tasks' | 'api_keys';

export interface ProjectMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  targetDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  taskCount?: number;
  progress?: number;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
}

export interface ProjectProgressResponse {
  progress: number;
  totalTasks: number;
  completedTasks: number;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  targetDate?: string;
  memberIds?: string[];
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  targetDate?: string;
}