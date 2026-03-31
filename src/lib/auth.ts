import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { query } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  name: string;
  role: string;
  google_id: string;
  image: string | null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      const rawEmail = user.email || profile?.email;
      const email = rawEmail?.toLowerCase();
      console.log("Login attempt with email:", email);
      
      if (!email) {
        console.log("Access Denied: No email provided.");
        return false; // Reject sign-in
      }

      // Upsert user into database on sign-in
      try {
        const googleId = account?.providerAccountId || "";
        const name = user.name || profile?.name || "Unknown";
        const image = user.image || (profile as Record<string, unknown>)?.picture as string || null;

        const existingUsers = await query<UserRow[]>(
          "SELECT * FROM users WHERE google_id = ? OR email = ?",
          [googleId, email]
        );

        if (existingUsers.length === 0) {
          await query(
            "INSERT INTO users (email, name, role, google_id, image) VALUES (?, ?, 'STUDENT', ?, ?)",
            [email, name, googleId, image]
          );
        } else {
          await query(
            "UPDATE users SET name = ?, image = ?, google_id = ? WHERE email = ?",
            [name, image, googleId, email]
          );
        }
      } catch (error) {
        console.error("Error upserting user:", error);
        return false;
      }

      return true;
    },

    // Attach user id and role to the JWT token
    async jwt({ token, user, account }) {
      if (account && user?.email) {
        // First sign-in: fetch user from DB to get id and role
        try {
          const users = await query<UserRow[]>(
            "SELECT id, role FROM users WHERE email = ?",
            [user.email]
          );
          if (users.length > 0) {
            token.userId = users[0].id;
            token.role = users[0].role;
          }
        } catch (error) {
          console.error("Error fetching user for JWT:", error);
        }
      }
      return token;
    },
  },
});
