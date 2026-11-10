<?php

namespace App\Http\Requests;

use App\Enums\RecordStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The controller's can: middleware already decided who may get here.
        return true;
    }

    public function rules(): array
    {
        $school = $this->route('school');
        $section = $this->route('section'); // null when creating

        // Creating needs a title; a partial update may leave it out.
        $titlePresence = $this->isMethod('post') ? ['required'] : ['sometimes', 'required'];

        return [
            'title' => [
                ...$titlePresence,
                'string',
                'max:100',
                Rule::unique('sections', 'title')
                    ->where('school_id', $school->id)
                    ->ignore($section?->id),
            ],
            'status' => ['sometimes', 'required', Rule::enum(RecordStatus::class)],
        ];
    }
}
