<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

// school_id is deliberately not fillable: it is set through the school relation.
#[Fillable(['grade_id', 'title', 'description'])]
class SubjectGroup extends Model
{
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function sections(): BelongsToMany
    {
        return $this->belongsToMany(Section::class, 'subject_group_section');
    }

    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class, 'subject_group_subject');
    }
}
