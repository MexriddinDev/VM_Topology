<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('topology_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('topology_id')->constrained('topologies')->cascadeOnDelete();
            $table->string('action', 64);
            $table->string('entity_type', 32)->nullable();
            $table->string('entity_id')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['topology_id', 'created_at']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topology_activity_logs');
    }
};
