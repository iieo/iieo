'use client';

import type { TypedFormElement } from '@/utils/types';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import type React from 'react';

type LoginProps = {
  submitText: string;
  error?: string;
};

export default function Login({ error }: LoginProps) {
  async function handleLogin(event: React.FormEvent<TypedFormElement<'email' | 'password'>>) {
    event.preventDefault();

    const password = event.currentTarget.elements.password.value;
    const email = event.currentTarget.elements.email.value;

    await signIn('credentials', { email, password });
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="grid w-full max-w-md p-10 bg-white rounded-xl drop-shadow-overlay">
        <form className="grid grid-cols-1 gap-y-4" onSubmit={handleLogin}>
          <AdminLoginInput />
          {error && (
            <p className="text-red" role="alert">
              Der Nutzername oder das Passwort ist falsch.
            </p>
          )}
          <button className="btn btn-primary w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Login
          </button>
          <div className="flex gap-2 items-center">
            {/* eslint-disable-next-line react/no-unescaped-entities */}
            <p className="text-gray-600">Don't have an account?</p>
            <Link
              href="/register"
              className="text-grey-600 font-bold py-2 rounded focus:outline-none focus:shadow-outline"
            >
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminLoginInput() {
  return (
    <div className="flex flex-col gap-y-4">
      <label htmlFor="flex flex-col gap-y-2 code">
        <span className="text-2xl font-medium">Login</span>
      </label>
      <div className="input input-login border rounded-lg p-2">
        <input
          type="text"
          name="email"
          className="text-md h-full w-full text-clip bg-transparent outline-none"
          placeholder="Email"
          required
        />
      </div>
      <div className="input input-login border rounded-lg p-2">
        <input
          type="password"
          name="password"
          className="text-md h-full w-full text-clip bg-transparent outline-none"
          placeholder="Passwort"
          required
        />
      </div>
    </div>
  );
}
