export type TeacherWithUser = {
  id: number;
  userId: number;
  businessId: number;
  user?: {
    id: number;
    name: string;
    email: string;
    mobile?: string;
    role: string;
  };
  designation?: string;
  qualification?: string;
  experienceYears?: number;
  languages?: string[];
  bio?: string;
  gender?: string;
  dob?: string | Date;
  address?: string;
};

