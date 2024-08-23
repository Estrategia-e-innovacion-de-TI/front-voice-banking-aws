import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: any;
  errorMessage: string = '';
  isRecording: boolean = false;
  mediaRecorder: any;
  audioChunks: any[] = [];
  audioBlob: Blob | null = null;
  audioUrl: string | null = null;
  formatedText: string | null = null;
  resultAudioUrl: string | null = null;


  constructor(private authService: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.authService.getUserProfile().subscribe({
      next: (data) => {
        this.user = data;
      },
      error: () => {
        this.errorMessage = 'Failed to load user profile.';
      }
    });
  }

  startRecording() {
    this.isRecording = true;
    this.audioChunks = [];

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
          this.audioChunks.push(event.data);
        };
        this.mediaRecorder.start();
      })
      .catch(err => {
        console.error('The following error occurred: ' + err);
      });
  }

  stopRecording() {
    this.isRecording = false;
    this.mediaRecorder.stop();
    this.mediaRecorder.onstop = () => {
      this.audioBlob = new Blob(this.audioChunks, { type: 'audio.webm' });
      this.audioUrl = URL.createObjectURL(this.audioBlob);
    };
  }
  sendAudio() {
    if (!this.audioBlob) {
      this.errorMessage = 'No audio recorded';
      return;
    }

    const formData = new FormData();
    formData.append('file', this.audioBlob, 'audio.webm');

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.post<any>(`${this.authService.apiUrl}/users/me/transactions-audio/`, formData, { headers })
      .subscribe({
        next: (response) => {
          this.formatedText = response.formated_text;

          // Decodificar el audio base64 y crear una URL para reproducirlo
          const audioBlob = this.base64ToBlob(response.audio_base64, 'audio/wav');
          this.resultAudioUrl = URL.createObjectURL(audioBlob);
        },
        error: (error) => {
          console.error('Failed to send audio', error);
          this.errorMessage = 'Failed to send audio';
        }
      });
  }

  base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }
}
