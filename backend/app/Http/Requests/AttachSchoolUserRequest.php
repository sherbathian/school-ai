<?php

namespace App\Http\Requests;

use App\Enums\SchoolRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class AttachSchoolUserRequest extends FormRequest
{
    public function authorize(): bool
    {
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
            'email' => ['required', 'email', 'exists:users,email'],
            'role' => ['required', Rule::enum(SchoolRole::class)],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $alreadyMember = $this->route('school')
                    ->users()
                    ->where('users.email', $this->input('email'))
                    ->exists();

                if ($alreadyMember) {
                    $validator->errors()->add('email', 'This person is already a member of the school.');
                }
            },
        ];
    }
}
