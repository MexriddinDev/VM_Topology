<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('topology_nodes', 'display_name')) {
            Schema::table('topology_nodes', function (Blueprint $table) {
                $table->string('display_name')->nullable()->after('server_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('topology_nodes', function (Blueprint $table) {
            $table->dropColumn('display_name');
        });
    }
};
