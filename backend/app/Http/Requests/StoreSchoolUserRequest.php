<?php

namespace App\Http\Requests;

use App\Enums\SchoolRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreSchoolUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The route's can: middleware already decided who may get here.
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => Str::lower(trim($this->input('email')))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(10)],
            'role' => ['required', Rule::enum(SchoolRole::class)],
        ];
    }
}
