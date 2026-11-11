<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubjectGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The controller's can: middleware already decided who may get here.
        return true;
    }

    public function rules(): array
    {
        $school = $this->route('school');
        $group = $this->route('subject_group'); // null when creating
        $creating = $this->isMethod('post');

        // Creating needs a title; a partial update may leave it out.
        $titlePresence = $creating ? ['required'] : ['sometimes', 'required'];

        // The grade is chosen when the group is created and fixed afterwards.
        $gradeId = $creating ? $this->input('grade_id') : $group->grade_id;

        return [
            'grade_id' => $creating
                ? ['required', 'integer', Rule::exists('grades', 'id')->where('school_id', $school->id)]
                : ['prohibited'],

            'title' => [
                ...$titlePresence,
                'string',
                'max:150',
                Rule::unique('subject_groups', 'title')
                    ->where('school_id', $school->id)
                    ->where('grade_id', $gradeId)
                    ->ignore($group?->id),
            ],

            'description' => ['nullable', 'string', 'max:2000'],

            // The full list of ids this group should have. Leaving a list out on
            // an update means "leave it as it is".
            'section_ids' => ['sometimes', 'array'],
            'section_ids.*' => [
                'integer',
                'distinct',
                // A section is only allowed if the group's grade has it.
                Rule::exists('grade_section', 'section_id')->where('grade_id', $gradeId),
            ],

            'subject_ids' => ['sometimes', 'array'],
            'subject_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('subjects', 'id')->where('school_id', $school->id),
            ],
        ];
    }
}
