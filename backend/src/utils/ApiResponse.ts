export class ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;

  constructor(message: string, data?: T) {
    this.success = true;
    this.message = message;
    this.data = data;
  }
}
