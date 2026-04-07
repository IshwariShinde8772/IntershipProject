import { Download, Eye, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Table, TableCell, TableHead } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { categories, departments, placementStatuses, roles } from "../../utils/constants";

const statusVariant = {
  PLACED: "green",
  NOT_PLACED: "slate",
  OPTED_OUT: "orange",
  HIGHER_STUDIES: "blue"
};

function BulkImportModal({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!open) return null;

  const onUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/students/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(response.data);
      onImported();
      toast.success("Student import finished");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Bulk Import Students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <div className="flex gap-3">
            <Button onClick={onUpload} disabled={!file || loading}>
              {loading ? "Processing..." : "Upload"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>

          {result ? (
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="text-emerald-700">Imported successfully: {result.imported}</div>
              <div className="text-amber-700">Skipped duplicates: {result.skipped}</div>
              <div className="text-red-700">Errors: {result.errors.length}</div>
              {result.errors.map((errorItem, index) => (
                <div key={`${errorItem.row}-${index}`} className="rounded-xl border border-red-100 bg-white p-3 text-slate-600">
                  Row {errorItem.row} {errorItem.prn ? `(${errorItem.prn})` : ""}: {errorItem.reason}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function StudentsListPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [showImport, setShowImport] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: "",
    department: "",
    placement_status: "",
    cgpa_min: "",
    category: "",
    dead_atkt: "",
    year_drop: ""
  });

  const loadStudents = async () => {
    try {
      const response = await api.get("/students", { params: filters });
      setStudents(response.data.data);
      setMeta(response.data.meta);
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to load students");
    }
  };

  useEffect(() => {
    loadStudents();
  }, [filters]);

  const activeFilters = useMemo(() => {
    const next = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "") next[key] = value;
    });
    return next;
  }, [filters]);

  const exportStudents = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/students/export?${new URLSearchParams(activeFilters).toString()}`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${window.__accessToken ?? ""}`
          }
        }
      );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "students.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const removeStudent = async (id) => {
    if (!window.confirm("Deactivate this student account?")) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success("Student deactivated");
      loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <BulkImportModal open={showImport} onClose={() => setShowImport(false)} onImported={loadStudents} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500">Search, filter, import, and manage student profiles.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <Button variant="outline" onClick={exportStudents}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Link to="/students/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <Input
            placeholder="Search by name, PRN, college ID"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
          <Select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}>
            <option value="">All Departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </Select>
          <Select value={filters.placement_status} onChange={(event) => setFilters((current) => ({ ...current, placement_status: event.target.value }))}>
            <option value="">All Statuses</option>
            {placementStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          <Input type="number" placeholder="Min CGPA" value={filters.cgpa_min} onChange={(event) => setFilters((current) => ({ ...current, cgpa_min: event.target.value }))} />
          <Select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
          <Select value={filters.dead_atkt} onChange={(event) => setFilters((current) => ({ ...current, dead_atkt: event.target.value }))}>
            <option value="">Dead ATKTs</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2+">2+</option>
          </Select>
          <Select value={filters.year_drop} onChange={(event) => setFilters((current) => ({ ...current, year_drop: event.target.value }))}>
            <option value="">Year Drop</option>
            <option value="nodrop">No Drop</option>
            <option value="hasdrop">Has Drop</option>
          </Select>
          <Button className="md:col-span-3 xl:col-span-7" onClick={loadStudents}>
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <TableHead>Name</TableHead>
                <TableHead>PRN</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ATKTs</TableHead>
                <TableHead>Actions</TableHead>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-slate-100">
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.prn}</TableCell>
                  <TableCell>{student.department}</TableCell>
                  <TableCell>{student.aggregate_cgpa}</TableCell>
                  <TableCell>
                    <Badge variant={student.is_profile_complete ? "green" : "yellow"}>
                      {student.is_profile_complete
                        ? "Ready"
                        : `${student.profile_completion ?? 0}%`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[student.placement_status] ?? "slate"}>{student.placement_status}</Badge>
                  </TableCell>
                  <TableCell>
                    {student.dead_atkt_count}/{student.live_atkt_count}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link to={`/students/${student.id}`}>
                        <Button variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {user.role === roles.SUPER_ADMIN ? (
                        <Button variant="ghost" onClick={() => removeStudent(student.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Page {meta.page} of {meta.totalPages}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" disabled={meta.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>
            Previous
          </Button>
          <Button variant="outline" disabled={meta.page >= meta.totalPages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
