<?php

namespace App\Http\Requests;

use App\Enums\SchoolStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSchoolRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Admins may edit details, but only a super admin may change status.
        return ! $this->has('status') || $this->user()->is_super_admin;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'url' => ['nullable', 'url:http,https', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'about' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'required', Rule::enum(SchoolStatus::class)],
        ];
    }
}
