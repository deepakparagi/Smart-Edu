package edu.smartstudy;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
@RestControllerAdvice public class ApiExceptionHandler { @ExceptionHandler(MaxUploadSizeExceededException.class) ResponseEntity<?> tooLarge(){return ResponseEntity.status(413).body(Map.of("error","File exceeds the 20 MB upload limit"));} }
