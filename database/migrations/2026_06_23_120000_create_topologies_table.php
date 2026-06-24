<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('topologies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->float('viewport_x')->default(0);
            $table->float('viewport_y')->default(0);
            $table->float('viewport_zoom')->default(0.75);
            $table->boolean('is_default')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('topology_nodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('topology_id')->constrained('topologies')->cascadeOnDelete();
            $table->string('server_id');
            $table->float('position_x')->default(0);
            $table->float('position_y')->default(0);
            $table->timestamps();

            $table->unique(['topology_id', 'server_id']);
            $table->index('server_id');
        });

        Schema::create('topology_edges', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('topology_id')->constrained('topologies')->cascadeOnDelete();
            $table->string('source_server_id');
            $table->string('target_server_id');
            $table->string('source_handle')->nullable();
            $table->string('target_handle')->nullable();
            $table->string('label')->nullable();
            $table->boolean('animated')->default(true);
            $table->timestamps();

            $table->index(['topology_id', 'source_server_id']);
            $table->index(['topology_id', 'target_server_id']);
        });

        Schema::create('topology_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_topology_id')->constrained('topologies')->cascadeOnDelete();
            $table->foreignId('target_topology_id')->constrained('topologies')->cascadeOnDelete();
            $table->string('source_server_id')->nullable();
            $table->string('label')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topology_links');
        Schema::dropIfExists('topology_edges');
        Schema::dropIfExists('topology_nodes');
        Schema::dropIfExists('topologies');
    }
};
