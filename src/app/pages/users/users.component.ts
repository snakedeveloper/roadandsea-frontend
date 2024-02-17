import { AfterContentInit, AfterViewInit, Component, OnInit, ViewChild, ViewChildren } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { DataService } from 'src/app/services/data/data.service';
import { User } from 'src/app/templates/data/user';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements AfterViewInit {
  @ViewChild('usersPaginator') paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    public dataService: DataService,
  ) { }

  ngAfterViewInit(): void {
    this.dataService.store.collection('users').valueChanges().subscribe(users => {
      this.dataService.users_table_data = users as User[]
      this.dataService.users_table_data.forEach(user => {
        if(user.logUsersDate && user.inLogUsers) {
          this.dataService.setLoggedTime(user)
        }
      })
      this.dataService.usersDataSource = new MatTableDataSource<User>(this.dataService.users_table_data)
      this.dataService.usersDataSource.paginator = this.paginator
      this.dataService.usersDataSource.paginator._intl.itemsPerPageLabel = 'Liczba wierszy:';
        this.dataService.usersDataSource.paginator._intl.firstPageLabel = 'Pierwsza strona';
        this.dataService.usersDataSource.paginator._intl.lastPageLabel = 'Ostatnia strona';
        this.dataService.usersDataSource.paginator._intl.nextPageLabel = 'Następna strona';
        this.dataService.usersDataSource.paginator._intl.previousPageLabel = 'Poprzednia strona';
        this.dataService.usersDataSource.paginator._intl.getRangeLabel = (page: number, pageSize: number, length: number) => {
          if(length == 0 || pageSize == 0) {
            return `0 z ${length}`;
          }
          length = Math.max(length, 0);
          const startIndex = page * pageSize;
          const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; 
          return `${startIndex + 1} - ${endIndex} z ${length}`; 
        }
        this.dataService.usersDataSource.sort = this.sort;
          const sortState: Sort = {active: 'name', direction: 'desc'};
          this.dataService.usersDataSource.sort.active = sortState.active;
          this.dataService.usersDataSource.sort.direction = sortState.direction;
          this.dataService.usersDataSource.sort.sortChange.emit(sortState);       
      })
  }

  setAdminButton(uid: string) {
    this.dataService.setAdmin(uid)
  }
  disableAdminButton(uid: string) {
    this.dataService.disableAdmin(uid)
  }
  showFoldersButton(uid: string) {
    this.dataService.showFolders(uid)
  }
  hideFoldersButton(uid: string) {
    this.dataService.hideFolders(uid)
  }

  isSpedTransLogged(spedtrans: boolean): string {
    if(spedtrans)
    return 'Tak'
    else
    return 'Nie'
  }

}
