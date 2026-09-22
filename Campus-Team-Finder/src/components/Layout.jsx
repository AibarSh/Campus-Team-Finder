import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <Header />
      <div className="flex flex-grow">
        <Sidebar />
        <div className="flex-grow">{children}</div>
      </div>
    </div>
  );
}