import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Table, TableCell, TableHead } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { departments, driveStatuses, roles } from "../../utils/constants";
import { formatDate } from "../../utils/format";

const statusVariant = {
  UPCOMING: "blue",
  ONGOING: "yellow",
  COMPLETED: "green",
  CANCELLED: "red"
};

export function DrivesListPage() {
  const { user } = useAuth();
  const [drives, setDrives] = useState([]);
  const [filters, setFilters] = useState({
    status: "",
    department: "",
    date_from: "",
    date_to: ""
  });

  const loadDrives = async () => {
    try {
      const response = await api.get("/drives", { params: filters });
      setDrives(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to load drives");
    }
  };

  useEffect(() => {
    loadDrives();
  }, [filters.status, filters.department, filters.date_from, filters.date_to]);

  const applyToDrive = async (id) => {
    try {
      await api.post(`/drives/${id}/apply`);
      toast.success("Applied to drive");
      loadDrives();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to apply");
    }
  };

  const removeDrive = async (driveId, driveTitle) => {
    const confirmed = window.confirm(
      `Delete opportunity "${driveTitle}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/drives/${driveId}`);
      toast.success("Opportunity deleted successfully");
      loadDrives();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to delete opportunity");
    }
  };

  const studentRows = useMemo(() => {
    if (user.role !== roles.STUDENT) return drives;
    return drives.filter((drive) => drive.student_application?.is_eligible);
  }, [drives, user]);

  const rows = user.role === roles.STUDENT ? studentRows : drives;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Opportunities</h1>
          <p className="text-sm text-slate-500">Manage and track placement drives, internships, and other upcoming opportunities.</p>
        </div>
        {user.role !== roles.STUDENT ? (
          <Link to="/drives/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Opportunity
            </Button>
          </Link>
        ) : null}
      </div>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All Statuses</option>
            {driveStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </Select>
          <Select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}>
            <option value="">All Departments</option>
            {departments.map((department) => (
              <option key={department}>{department}</option>
            ))}
          </Select>
          <Input type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} />
          <Input type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <TableHead>Opportunity Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Job Profile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Eligible Count</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Missed</TableHead>
                <TableHead>Actions</TableHead>
              </tr>
            </thead>
            <tbody>
              {rows.map((drive) => {
                const application = drive.student_application ?? drive.applications?.[0] ?? null;
                return (
                  <tr key={drive.id} className="border-b border-slate-100">
                    <TableCell>{drive.title}</TableCell>
                    <TableCell>{drive.company.name}</TableCell>
                    <TableCell>{formatDate(drive.drive_date)}</TableCell>
                    <TableCell>{drive.package_lpa} LPA</TableCell>
                    <TableCell>{drive.job_profile}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[drive.status] ?? "slate"}>{drive.status}</Badge>
                    </TableCell>
                    <TableCell>{drive.eligible_count}</TableCell>
                    <TableCell>{drive.pending_response_count ?? 0}</TableCell>
                    <TableCell>{drive.missed_response_count ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/drives/${drive.id}`}>
                          <Button variant="outline">View</Button>
                        </Link>
                        {user.role !== roles.STUDENT ? (
                          <Link to={`/drives/${drive.id}/edit`}>
                            <Button variant="outline">
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          </Link>
                        ) : null}
                        {user.role === roles.SUPER_ADMIN ? (
                          <Button
                            variant="danger"
                            onClick={() => removeDrive(drive.id, drive.title)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        ) : null}
                        {user.role === roles.STUDENT ? (
                          <Button
                            disabled={
                              application?.opted_in ||
                              new Date(drive.registration_deadline) < new Date()
                            }
                            onClick={() => applyToDrive(drive.id)}
                          >
                            {application?.opted_in
                              ? "Applied"
                              : new Date(drive.registration_deadline) < new Date()
                                ? "Closed"
                                : "Opt In"}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
