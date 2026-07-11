"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usernameToFakeEmail } from "@/lib/username-auth";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email = usernameToFakeEmail(username);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        const userId = data.user?.id;
        if (!userId) throw new Error("Signup did not return a user.");

        let photoUrl: string | null = null;
        if (photoFile) {
          const path = `${userId}/${Date.now()}-${photoFile.name}`;
          const { error: uploadError } = await supabase.storage
            .from("upi-avatars")
            .upload(path, photoFile);
          if (uploadError) throw uploadError;
          const { data: publicUrl } = supabase.storage
            .from("upi-avatars")
            .getPublicUrl(path);
          photoUrl = publicUrl.publicUrl;
        }

        const { error: profileError } = await supabase
          .from("upi_profiles")
          .insert({
            id: userId,
            username: username.trim().toLowerCase(),
            display_name: displayName.trim() || username.trim(),
            photo_url: photoUrl,
          });
        if (profileError) throw profileError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword(
          { email, password }
        );
        if (signInError) throw signInError;
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-6 py-10">
      <h1 className="text-2xl font-bold text-center mb-1">UPI for Mom</h1>
      <p className="text-center text-gray-500 mb-8">
        {mode === "login" ? "Log in to continue" : "Create your account"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
            placeholder="e.g. mom"
            autoCapitalize="none"
          />
        </div>

        {mode === "signup" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Your name (shown to others)
            </label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
              placeholder="e.g. Mummy"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
            placeholder="Choose a simple password"
          />
        </div>

        {mode === "signup" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Your photo (so others recognize you)
            </label>
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      <button
        onClick={() => {
          setError(null);
          setMode(mode === "login" ? "signup" : "login");
        }}
        className="mt-6 text-center text-brand-700 underline text-sm"
      >
        {mode === "login"
          ? "New here? Create an account"
          : "Already have an account? Log in"}
      </button>
    </div>
  );
}
