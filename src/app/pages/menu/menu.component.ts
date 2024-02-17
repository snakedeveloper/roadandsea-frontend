import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { DataService } from 'src/app/services/data/data.service';
import { LoginService } from 'src/app/services/login/login.service';
import { NavList } from 'src/app/templates/menu/navList';


@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class MenuComponent implements OnInit, AfterViewInit {
  @ViewChild('sidecontent', {read: ElementRef, static:false}) elementView: ElementRef | undefined;
  @HostListener('window:resize', ['$event']) onResize() {
    this.setSideNavHeight()
 }
  
  /**
   * @var isSideNavOpened nav close or open if changed
   */
  isSideNavOpened: boolean = true;

  /**
   * @var navList - List of the buttons in side menu
   */
 navList = this.dataService.navList;
  constructor(
    public dataService: DataService,
    public loginService: LoginService,
  ) { }

  ngOnInit(): void {
  }
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.setSideNavHeight()
    }, 1)
  }


  /**
   * @todo Toggle side navigation open or closed
   */
  toggleSideNav() {
    switch (this.isSideNavOpened) {
      case true:
        this.isSideNavOpened = false;
        break;
      case false:
        this.isSideNavOpened = true;
        break;
    }
  }

  /**
   * @todo -Set variable sideNavContentHeightNumber in DataService as height px in number
   */
  setSideNavHeight() {
    if(this.elementView)
      this.dataService.sideNavContentHeightNumber = this.elementView.nativeElement.offsetHeight;
  }

}
