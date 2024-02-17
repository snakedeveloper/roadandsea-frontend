import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { LoginService } from '../services/login/login.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})

export class LoginComponent implements OnInit {
  /**
   * Login Variables
   */
  loginLoading: boolean = false;
  emailInput: string = '';
  emailFormControl = new FormControl('', [
    Validators.required,
    Validators.email,
  ]);

  constructor(
    public loginService: LoginService,
  ) { }

  ngOnInit(): void {

  }

  /**
  * Event fired when "Login" button is clicked
  */
  async onLoginClicked(): Promise<void> {
    this.loginLoading = true
    await this.loginService.checkUser(this.emailInput)
    this.loginLoading = false;
  }
}
