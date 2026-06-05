import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { logAuthEnvStatus } from "@/lib/auth-env";
import { notifyAdminsNewAccessRequest } from "@/lib/email";
import { applySuperAdminPrivileges, isSuperAdminEmail } from "@/lib/super-admin";

const authEnv = logAuthEnvStatus("startup");

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  trustHost: true,
  secret: authEnv.nextAuthSecret,
  pages: {
    signIn: "/login"
  },
  providers: authEnv.googleConfigured ? [
    Google({
      clientId: authEnv.googleClientId,
      clientSecret: authEnv.googleClientSecret,
      allowDangerousEmailAccountLinking: true
    })
  ] : [],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      if (isSuperAdminEmail(user.email)) {
        const existing = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (existing) {
          await applySuperAdminPrivileges(existing.email);
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (!session.user?.email && !user?.email) return session;
      const email = (user?.email || session.user?.email || "").toLowerCase();
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          full_name: true,
          image: true,
          role: true,
          status: true,
          accessApproved: true,
          pode_editar_importar: true
        }
      });

      if (dbUser) {
        session.user = {
          ...session.user,
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name || dbUser.full_name || session.user?.name,
          image: dbUser.image || session.user?.image,
          role: dbUser.role,
          status: dbUser.status,
          accessApproved: dbUser.accessApproved,
          pode_editar_importar: dbUser.pode_editar_importar
        };
      }

      return session;
    }
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      const email = user.email.toLowerCase();
      const now = new Date();
      const superAdmin = isSuperAdminEmail(email);
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          name: user.name,
          full_name: user.name,
          image: user.image,
          requestedAt: now,
          role: superAdmin ? "admin" : "user",
          status: superAdmin ? "approved" : "pending",
          accessApproved: superAdmin,
          pode_editar_importar: superAdmin,
          approvedAt: superAdmin ? now : null,
          approvedBy: superAdmin ? "bootstrap" : null
        }
      });

      if (!superAdmin) {
        await notifyAdminsNewAccessRequest({
          id: updated.id,
          name: updated.name || updated.full_name,
          email: updated.email,
          requestedAt: updated.requestedAt
        });
      }
    }
  }
});
