<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('topology_edges')) {
            Schema::create('topology_edges', function (Blueprint $table) {
                $table->id();
                $table->foreignId('topology_id')->constrained('topologies')->onDelete('cascade');
                $table->foreignId('source_node_id')->constrained('topology_nodes')->onDelete('cascade');
                $table->foreignId('target_node_id')->constrained('topology_nodes')->onDelete('cascade');
                $table->string('source_handle')->nullable();
                $table->string('target_handle')->nullable();
                $table->timestamps();
                
                $table->unique(['topology_id', 'source_node_id', 'target_node_id']);
                $table->index(['topology_id', 'source_node_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('topology_edges');
    }
};
