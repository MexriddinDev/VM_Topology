<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alert_events', function (Blueprint $table) {
            $table->id();
            $table->string('fingerprint', 64)->unique();
            $table->string('severity', 16);
            $table->string('type', 64);
            $table->string('instance');
            $table->text('message');
            $table->decimal('value', 12, 2)->default(0);
            $table->string('status', 16)->default('active');
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');
            $table->timestamp('resolved_at')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['severity', 'type']);
            $table->index(['status', 'last_seen_at']);
            $table->index('instance');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_events');
    }
};
