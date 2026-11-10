<?php

namespace App\Http\Requests;

use App\Enums\RecordStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The controller's can: middleware already decided who may get here.
        return true;
    }

    public function rules(): array
    {
        $school = $this->route('school');
        $grade = $this->route('grade'); // null when creating

        // Creating needs a title; a partial update may leave it out.
        $titlePresence = $this->isMethod('post') ? ['required'] : ['sometimes', 'required'];

        return [
            'title' => [
                ...$titlePresence,
                'string',
                'max:100',
                Rule::unique('grades', 'title')
                    ->where('school_id', $school->id)
                    ->ignore($grade?->id),
            ],
            'status' => ['sometimes', 'required', Rule::enum(RecordStatus::class)],

            // The full list of section ids this grade should have. Leaving it
            // out on an update means "leave the sections as they are".
            'section_ids' => ['sometimes', 'array'],
            'section_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('sections', 'id')->where('school_id', $school->id),
            ],
        ];
    }
}
