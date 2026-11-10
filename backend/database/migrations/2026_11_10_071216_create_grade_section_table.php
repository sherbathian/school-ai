<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grade_section', function (Blueprint $table) {
            // Deleting a grade removes its assignments; deleting a section
            // that a grade still uses is refused by the database.
            $table->foreignId('grade_id')->constrained()->cascadeOnDelete();
            $table->foreignId('section_id')->constrained()->restrictOnDelete();

            $table->primary(['grade_id', 'section_id']);
            $table->index('section_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_section');
    }
};
