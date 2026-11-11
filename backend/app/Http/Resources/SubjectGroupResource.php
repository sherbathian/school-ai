<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubjectGroupResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'grade_id' => $this->grade_id,
            'title' => $this->title,
            'description' => $this->description,
            'grade' => $this->whenLoaded('grade', fn() => [
                'id' => $this->grade->id,
                'title' => $this->grade->title,
            ]),
            'sections' => SectionResource::collection($this->whenLoaded('sections')),
            'subjects' => SubjectResource::collection($this->whenLoaded('subjects')),
        ];
    }
}
