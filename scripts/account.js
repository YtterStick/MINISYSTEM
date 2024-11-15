document.addEventListener('DOMContentLoaded', () => {
    const accountForm = document.getElementById('account-form');
    const updatePopUp = document.getElementById('update-popup');
    const closePopUp = document.getElementById('close-popup');
    const accountsTable = document.getElementById('accounts-table').getElementsByTagName('tbody')[0];
    
     function AddAccountRow(account){
        const row = accountsTable.insertRow();
        row.innerHTML = ''; 
     }
});