FROM php:8.3-cli-alpine

WORKDIR /var/www/html

# Install dependencies
RUN apk add --no-cache \
    curl \
    zip \
    unzip \
    git \
    && docker-php-ext-install opcache

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy app
COPY . .

# Install PHP packages
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Set permissions
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Start with Laravel's built-in server (use nginx+php-fpm in production)
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
