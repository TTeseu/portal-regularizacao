import "next-auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    status?: string;
    accessApproved?: boolean;
    pode_editar_importar?: boolean;
  }

  interface Session {
    user?: {
      id?: string;
      role?: string;
      status?: string;
      accessApproved?: boolean;
      pode_editar_importar?: boolean;
    } & DefaultSession["user"];
  }
}
