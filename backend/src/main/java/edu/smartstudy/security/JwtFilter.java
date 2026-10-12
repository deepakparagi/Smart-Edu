package edu.smartstudy.security;
import edu.smartstudy.user.User;
import edu.smartstudy.user.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtFilter extends OncePerRequestFilter {
    private final TokenService tokens;
    private final UserRepository users;

    public JwtFilter(TokenService tokens, UserRepository users) {
        this.tokens = tokens;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Cookie[] cs = req.getCookies();
        if (cs != null) {
            for (Cookie c : cs) {
                if (c.getName().equals("study_session")) {
                    try {
                        Claims claims = tokens.parse(c.getValue());
                        String email = claims.getSubject();
                        Integer tokenVersion = claims.get("token_version", Integer.class);
                        
                        // Verify user exists, is enabled, and token version matches
                        var userOpt = users.findEnabledByEmailIgnoreCase(email);
                        if (userOpt.isPresent()) {
                            User user = userOpt.get();
                            if (tokenVersion != null && tokenVersion.equals(user.getTokenVersion())) {
                                var auth = new UsernamePasswordAuthenticationToken(
                                        email,
                                        null,
                                        List.of(new SimpleGrantedAuthority("ROLE_" + claims.get("role", String.class)))
                                );
                                SecurityContextHolder.getContext().setAuthentication(auth);
                            }
                        }
                    } catch (Exception ignored) {
                        // Invalid/expired token - continue without authentication
                    }
                    break; // Only process first study_session cookie
                }
            }
        }
        chain.doFilter(req, res);
    }
}