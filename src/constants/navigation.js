export const ROLE_NAV = {
  USER: ['/', '/lots', '/bookings'],
  OWNER: ['/', '/lots'],
  ADMIN: ['/', '/lots', '/admin/users', '/admin/lots', '/admin/bookings'],
};

export const SIDEBAR_GROUPS = {
  USER: [
    { label: 'Dashboard', to: '/', icon: 'grid' },
    { label: 'Parking Lots', to: '/lots', icon: 'lot' },
    { label: 'My Bookings', to: '/bookings', icon: 'calendar' },
  ],
  OWNER: [
    { label: 'Dashboard', to: '/', icon: 'grid' },
    { label: 'Parking Lots', to: '/lots', icon: 'lot' },
  ],
  ADMIN: [
    { label: 'Dashboard', to: '/', icon: 'grid' },
    { label: 'Parking Lots', to: '/lots', icon: 'lot' },
    { label: 'Users', to: '/admin/users', icon: 'users' },
    { label: 'All Lots', to: '/admin/lots', icon: 'stack' },
    { label: 'Bookings', to: '/admin/bookings', icon: 'calendar' },
  ],
};
