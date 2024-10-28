package middleware

import (
	"context"
	"net/http"
	"openreplay/backend/internal/http/util"
	"openreplay/backend/pkg/common"
	"openreplay/backend/pkg/common/api/auth"
	"openreplay/backend/pkg/logger"
)

type userDataKey struct{}

func CORS(useAccessControlHeaders bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/" {
				next.ServeHTTP(w, r)
				return
			}
			if useAccessControlHeaders {
				w.Header().Set("Access-Control-Allow-Origin", "*")
				w.Header().Set("Access-Control-Allow-Methods", "POST,GET,PATCH,DELETE")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization,Content-Encoding")
			}
			if r.Method == http.MethodOptions {
				w.Header().Set("Cache-Control", "max-age=86400")
				w.WriteHeader(http.StatusOK)
				return
			}
			r = r.WithContext(context.WithValue(r.Context(), "httpMethod", r.Method))
			r = r.WithContext(context.WithValue(r.Context(), "url", util.SafeString(r.URL.Path)))
			next.ServeHTTP(w, r)
		})
	}
}

// AuthMiddleware function takes dynamic parameters to handle custom authentication logic
func AuthMiddleware(
	services *common.ServicesBuilder, // Injected services (Auth, Keys, etc.)
	log logger.Logger, // Logger for logging events
	excludedPaths map[string]map[string]bool, // Map of excluded paths with methods
	getPermissions func(path string) []string,
	authOptionsSelector func(r *http.Request) *auth.Options, // Function to retrieve permissions for a path
) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/" {
				next.ServeHTTP(w, r)
				return
			}

			// Exclude specific paths and methods from auth
			if methods, ok := excludedPaths[r.URL.Path]; ok && methods[r.Method] {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				log.Warn(r.Context(), "Authorization header missing")
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			// Get AuthOptions for the request
			options := auth.Options{
				JwtColumn: services.Auth.JWTCol(), // Default JWT column from ServicesBuilder
				Secret:    services.Auth.Secret(), // Default secret from ServicesBuilder
			}

			if authOptionsSelector != nil {
				selectorOptions := authOptionsSelector(r)
				if selectorOptions != nil {
					// Override defaults with values from selectorOptions
					if selectorOptions.JwtColumn != "" {
						options.JwtColumn = selectorOptions.JwtColumn
					}
					if selectorOptions.Secret != "" {
						options.Secret = selectorOptions.Secret
					}
				}
			}

			// Check if this request is authorized
			user, err := services.Auth.IsAuthorized(authHeader, getPermissions(r.URL.Path), options)
			if err != nil {
				log.Warn(r.Context(), "Unauthorized request: %s", err)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			// Add userData to the context for downstream handlers
			ctx := context.WithValue(r.Context(), userDataKey{}, user)
			r = r.WithContext(ctx)

			// Call the next handler with the modified request
			next.ServeHTTP(w, r)
		})
	}
}

// GetUserData Helper function to retrieve userData from the request context
func GetUserData(r *http.Request) (*auth.User, bool) {
	user, ok := r.Context().Value(userDataKey{}).(*auth.User)
	return user, ok
}

func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Implement rate limiting logic here
		next.ServeHTTP(w, r)
	})
}

func Action(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Implement action logging or processing logic here
		next.ServeHTTP(w, r)
	})
}
