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
        System.err.println("[JwtFilter] Cookies received: " + (cs != null ? cs.length : 0));
        if (cs != null) {
            for (Cookie c : cs) {
                System.err.println("[JwtFilter] Cookie: " + c.getName() + " = " + c.getValue().substring(0, Math.min(20, c.getValue().length())) + "...");
                if (c.getName().equals("study_session")) {
                    try {
                        Claims claims = tokens.parse(c.getValue());
                        System.err.println("[JwtFilter] Token parsed successfully. Subject: " + claims.getSubject());
                        String email = claims.getSubject();
                        Integer tokenVersion = claims.get("token_version", Integer.class);
                        System.err.println("[JwtFilter] Token version from claim: " + tokenVersion);
                        
                        // Verify user exists, is enabled, and token version matches
                        var userOpt = users.findEnabledByEmailIgnoreCase(email);
                        System.err.println("[JwtFilter] User found: " + userOpt.isPresent());
                        if (userOpt.isPresent()) {
                            User user = userOpt.get();
                            System.err.println("[JwtFilter] User token_version: " + user.getTokenVersion() + ", enabled: " + user.isEnabled());
                            if (tokenVersion != null && tokenVersion.equals(user.getTokenVersion())) {
                                var auth = new UsernamePasswordAuthenticationToken(
                                        email,
                                        null,
                                        List.of(new SimpleGrantedAuthority("ROLE_" + claims.get("role", String.class)))
                                );
                                SecurityContextHolder.getContext().setAuthentication(auth);
                                System.err.println("[JwtFilter] Authentication set successfully");
                            } else {
                                System.err.println("[JwtFilter] Token version mismatch or null");
                            }
                        }
                    } catch (Exception e) {
                        // Invalid/expired token - continue without authentication
                        System.err.println("[JwtFilter] Exception parsing token: " + e.getMessage());
                        e.printStackTrace(System.err);
                    }
                    break; // Only process first study_session cookie
                }
            }
        }
        chain.doFilter(req, res);
    }
}