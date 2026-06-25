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
        if (!Schema::hasTable('topology_nodes')) {
            Schema::create('topology_nodes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('topology_id')->constrained('topologies')->onDelete('cascade');
                $table->string('server_id');
                $table->string('server_name');
                $table->decimal('position_x', 10, 2)->default(0);
                $table->decimal('position_y', 10, 2)->default(0);
                $table->timestamps();
                
                $table->unique(['topology_id', 'server_id']);
                $table->index('topology_id');
            });
        } else {
            Schema::table('topology_nodes', function (Blueprint $table) {
                if (!Schema::hasColumn('topology_nodes', 'server_name')) {
                    $table->string('server_name')->nullable()->after('server_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('topology_nodes');
    }
};
