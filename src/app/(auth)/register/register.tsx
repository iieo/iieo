'use client';

import type { TypedFormElement } from '@/utils/types';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';

type RegistrationProps = {
  error?: string;
};

export default function Registration({ error }: RegistrationProps) {
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleRegistration(
    event: React.FormEvent<TypedFormElement<'email' | 'name' | 'password' | 'confirmPassword'>>,
  ) {
    event.preventDefault();
    setErrorMessage('');

    const email = event.currentTarget.elements.email.value;
    const name = event.currentTarget.elements.name.value;
    const password = event.currentTarget.elements.password.value;
    const confirmPassword = event.currentTarget.elements.confirmPassword.value;

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, password }),
      });

      if (!response.ok) {
        throw new Error('Failed to register');
      }
      setSuccessMessage('Registration successful! Please check your email to verify your account.');
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unexpected error occurred');
      }
    }
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="grid w-full max-w-md p-10 bg-white rounded-xl drop-shadow-overlay">
        <form className="grid grid-cols-1 gap-y-4" onSubmit={handleRegistration}>
          <AdminRegistrationInput />
          {errorMessage && (
            <p className="text-red-500" role="alert">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="text-green-500" role="success">
              {successMessage}
            </p>
          )}
          {error && (
            <p className="text-red-500" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Register
          </button>
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-grey-600 font-bold underline py-2 rounded focus:outline-none focus:shadow-outline"
            >
              Log In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function AdminRegistrationInput() {
  return (
    <div className="flex flex-col gap-y-4">
      <label htmlFor="registration">
        <span className="text-2xl font-medium">Registration</span>
      </label>
      <div className="input input-registration border rounded-lg p-2">
        <input
          type="text"
          name="name"
          className="text-md h-full w-full text-clip bg-transparent outline-none"
          placeholder="Username"
          required
        />
      </div>
      <div className="input input-registration border rounded-lg p-2">
        <input
          type="email"
          name="email"
          className="text-md h-full w-full text-clip bg-transparent outline-none"
          placeholder="Email"
          required
        />
      </div>
      <div className="input input-registration border rounded-lg p-2">
        <input
          type="password"
          name="password"
          className="text-md h-full w-full text-clip bg-transparent outline-none"
          placeholder="Password"
          required
        />
      </div>
      <div className="input input-registration border rounded-lg p-2">
        <input
          type="password"
          name="confirmPassword"
          className="text-md h-full w-full text-clip bg-transparent outline-none"
          placeholder="Confirm Password"
          required
        />
      </div>
    </div>
  );
}
