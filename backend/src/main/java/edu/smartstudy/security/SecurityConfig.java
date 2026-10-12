package edu.smartstudy.security;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
@Configuration @org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity public class SecurityConfig { @Bean CorsConfigurationSource corsConfigurationSource(@Value("${app.web-origin}") String webOrigin){var c=new CorsConfiguration();c.setAllowedOrigins(List.of(webOrigin));c.setAllowedMethods(List.of("GET","POST","PATCH","DELETE","OPTIONS"));c.setAllowedHeaders(List.of("Content-Type","X-CSRF-TOKEN"));c.setAllowCredentials(true);var source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/**",c);return source;} @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder(12);} @Bean SecurityFilterChain chain(HttpSecurity http,JwtFilter jwt)throws Exception{return http.csrf(c->c.disable()).cors(c->{}).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)).authorizeHttpRequests(a->a.requestMatchers("/api/v1/auth/**","/actuator/health").permitAll().anyRequest().authenticated()).addFilterBefore(jwt,UsernamePasswordAuthenticationFilter.class).build();} }
