<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->restrictOnDelete();
            $table->string('title', 100);
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['school_id', 'title']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
