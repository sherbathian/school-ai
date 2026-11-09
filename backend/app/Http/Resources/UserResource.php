<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'is_super_admin' => $this->is_super_admin,
            'schools' => $this->schools->map(fn($school) => [
                'id' => $school->id,
                'name' => $school->name,
                'slug' => $school->slug,
                'role' => $school->pivot->role->value,
            ]),
        ];
    }
}
