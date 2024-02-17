import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataService } from './services/data/data.service';
import { LoginService } from './services/login/login.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'tft-zlecenia';

  constructor( 
    public router: Router, 
    public loginService: LoginService,
    public dataService: DataService,
    ) {    
  }

  async ngOnInit(): Promise<void> {
  /**
     * If user is logged in it will set User Data in dataService
     */
      const storage_check = localStorage.getItem('sid')
      if (storage_check) {
        this.loginService.setUser();
        this.router.navigate(['orders'])
      }
  }
}
