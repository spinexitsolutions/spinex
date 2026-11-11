import AdminApp from "@/components/admin/AdminApp";

export default function AdminPage() {
  return (
    <>
      {/* Sets the "10% smaller" admin size before the page is first drawn, so a reload doesn't
          show the admin big and then shrink it (AdminApp also adds it, for moves inside the app). */}
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add("spx-admin")` }} />
      <AdminApp />
    </>
  );
}
