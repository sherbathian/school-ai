<?php

namespace App\Http\Requests;

use App\Enums\RecordStatus;
use App\Enums\SubjectType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SubjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The controller's can: middleware already decided who may get here.
        return true;
    }

    // Codes are stored in capitals, so "math-101" and "MATH-101" are one code.
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge(['code' => Str::upper(trim($this->input('code')))]);
        }
    }

    public function rules(): array
    {
        $school = $this->route('school');
        $subject = $this->route('subject'); // null when creating

        // Creating needs these fields; a partial update may leave them out.
        $presence = $this->isMethod('post') ? ['required'] : ['sometimes', 'required'];

        return [
            'title' => [...$presence, 'string', 'max:150'],
            'code' => [
                ...$presence,
                'string',
                'max:30',
                'regex:/^[A-Z0-9][A-Z0-9._-]*$/',
                Rule::unique('subjects', 'code')
                    ->where('school_id', $school->id)
                    ->ignore($subject?->id),
            ],
            'type' => [...$presence, Rule::enum(SubjectType::class)],
            'status' => ['sometimes', 'required', Rule::enum(RecordStatus::class)],
        ];
    }
}
