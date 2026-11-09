<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Http\Resources\UserResource;
use App\Http\Requests\ChangePasswordRequest;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email or password is wrong.'],
            ]);
        }

        return [
            'token' => $user->createToken('school-app', ['*'], now()->addHours(8))->plainTextToken,
            'user' => (new UserResource($user->load('schools')))->resolve(),
        ];
    }

    public function me(Request $request)
    {
        return (new UserResource($request->user()->load('schools')))->resolve();
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->noContent();
    }

    public function changePassword(ChangePasswordRequest $request)
    {
        $user = $request->user();

        if (! Hash::check($request->validated('current_password'), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update(['password' => $request->validated('password')]);

        // Sign out every other device, but keep the one making this request.
        $current = $user->currentAccessToken();
        $user->tokens()
            ->when(
                $current instanceof PersonalAccessToken,
                fn($query) => $query->where('id', '!=', $current->id),
            )
            ->delete();

        return response()->noContent();
    }
}
