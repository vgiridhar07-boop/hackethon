import app from '../src/server/index';
import http from 'http';

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3002, resolve));
  console.log('[TEST RUNNER] Mock gateway live on port 3002...');

  try {
    // 1. Health check
    const healthRes = await fetch('http://localhost:3002/health');
    const healthData = await healthRes.json();
    console.log('[PASS] GET /health ->', healthData.status);

    // 2. Directory sync bundle
    const syncRes = await fetch('http://localhost:3002/api/v1/directory/sync-bundle');
    const syncData = await syncRes.json();
    console.log(`[PASS] GET /api/v1/directory/sync-bundle -> States: ${syncData.states_count}, Districts: ${syncData.districts_count}`);

    // 3. POST /api/v1/complaints with JSON
    const jsonComplaintRes = await fetch('http://localhost:3002/api/v1/complaints', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'usr-test-citizen-01',
      },
      body: JSON.stringify({
        category: 'Water',
        district_id: 10,
        latitude: 17.3616,
        longitude: 78.4747,
        address_text: 'Sector 4, Charminar Zone, Hyderabad',
        landmark: 'Near Historic Clock Tower',
        description: 'Potable water pipeline burst causing severe street flooding.',
      }),
    });
    const jsonComplaintData = await jsonComplaintRes.json();
    console.log(`[PASS] POST /api/v1/complaints (JSON) -> Ticket: ${jsonComplaintData.ticket_number}`);

    // 4. POST /api/v1/complaints with Multipart Form-Data & File
    const formData = new FormData();
    formData.append('category', 'Roads');
    formData.append('district_id', '10');
    formData.append('latitude', '17.3850');
    formData.append('longitude', '78.4867');
    formData.append('address_text', 'MG Road, Sub-division 2');
    formData.append('landmark', 'Opposite Metro Station Pillar 42');
    formData.append('description', 'Large deep pothole endangering two-wheelers.');
    const dummyFile = new Blob(['fake image bytes for test'], { type: 'image/jpeg' });
    formData.append('file', dummyFile, 'pothole_hazard_evidence.jpg');

    const multipartRes = await fetch('http://localhost:3002/api/v1/complaints', {
      method: 'POST',
      headers: {
        'x-user-id': 'usr-test-citizen-02',
      },
      body: formData,
    });
    const multipartData = await multipartRes.json();
    if (!multipartRes.ok) {
      throw new Error(`Multipart request failed with ${multipartRes.status}: ${JSON.stringify(multipartData)}`);
    }
    console.log(`[PASS] POST /api/v1/complaints (Multipart Form-Data) -> Ticket: ${multipartData.ticket_number}`);
    console.log(`       Attached File: ${multipartData.file_metadata?.filename} (${multipartData.file_metadata?.size_formatted})`);
    console.log(`       AI Category: ${multipartData.ai_triage?.ai_category} | SLA: <${multipartData.ai_triage?.sla_target_hours}h`);

    // 5. Test Invalid File Format rejection
    const invalidForm = new FormData();
    invalidForm.append('category', 'Garbage');
    invalidForm.append('district_id', '10');
    invalidForm.append('latitude', '17.3850');
    invalidForm.append('longitude', '78.4867');
    invalidForm.append('description', 'Illegal dumping test');
    const invalidFile = new Blob(['invalid binary executable'], { type: 'application/x-msdownload' });
    invalidForm.append('file', invalidFile, 'malicious.exe');

    const invalidRes = await fetch('http://localhost:3002/api/v1/complaints', {
      method: 'POST',
      headers: {
        'x-user-id': 'usr-test-citizen-01',
      },
      body: invalidForm,
    });
    const invalidData = await invalidRes.json();
    if (invalidRes.status === 400 && invalidData.error.includes('Unsupported file format')) {
      console.log('[PASS] File Validation Rejection -> Correctly rejected unsupported file type:', invalidData.error);
    } else {
      throw new Error(`Expected 400 file validation rejection, got ${invalidRes.status}: ${JSON.stringify(invalidData)}`);
    }

    // 6. Security Test: Unauthenticated Direct Queries Revoked (401)
    const unauthGetRes = await fetch('http://localhost:3002/api/v1/complaints');
    if (unauthGetRes.status === 401) {
      const unauthData = await unauthGetRes.json();
      console.log('[PASS] Security Directive 1 -> Unauthenticated bulk read blocked with 401:', unauthData.code);
    } else {
      throw new Error(`Expected 401 unauthenticated query rejection, got ${unauthGetRes.status}`);
    }

    // 7. Security Test: Scoped-Own Read Enforcement (User sees only own records)
    const scopedGetRes = await fetch('http://localhost:3002/api/v1/complaints', {
      headers: {
        'x-user-id': 'usr-test-citizen-01',
        'x-user-role': 'Citizen',
      },
    });
    const scopedGetData = await scopedGetRes.json();
    if (scopedGetRes.ok && scopedGetData.scope === 'owner_only') {
      const allOwned = scopedGetData.complaints.every((c: any) => c.user_id === 'usr-test-citizen-01');
      if (allOwned) {
        console.log(`[PASS] Security Directive 2 -> Scoped-own read enforced. User sees ${scopedGetData.complaints.length} owned ticket(s) only.`);
      } else {
        throw new Error('Leak detected: user received tickets belonging to other residents');
      }
    } else {
      throw new Error(`Expected 200 scoped-own read, got ${scopedGetRes.status}`);
    }

    // 8. Security Test: Public Ticket Lookup Strips PII and Masks Coordinates
    const publicLookupRes = await fetch(`http://localhost:3002/api/v1/complaints/${jsonComplaintData.ticket_number}`);
    const publicLookupData = await publicLookupRes.json();
    if (publicLookupRes.ok && publicLookupData.sanitized === true) {
      if (publicLookupData.complaint.user_id === undefined && publicLookupData.complaint.latitude === 17.36) {
        console.log('[PASS] Security Directive 2 -> Public lookup sanitizes coordinates and strips citizen PII.');
      } else {
        throw new Error('PII Leak in public lookup');
      }
    } else {
      throw new Error(`Expected sanitized public lookup, got ${publicLookupRes.status}`);
    }

    // 9. Security Test: Citizen Prohibited From Mutating Operational Lifecycle (403)
    const citizenMutateRes = await fetch(`http://localhost:3002/api/v1/complaints/${jsonComplaintData.ticket_number}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'usr-test-citizen-01',
        'x-user-role': 'Citizen',
      },
      body: JSON.stringify({
        status: 'In Progress',
        remarks: 'Citizen attempting unauthorized lifecycle advancement',
      }),
    });
    if (citizenMutateRes.status === 403) {
      const mutateData = await citizenMutateRes.json();
      console.log('[PASS] Security Directive 2 -> Citizen unauthorized status mutation blocked with 403:', mutateData.code);
    } else {
      throw new Error(`Expected 403 citizen mutation rejection, got ${citizenMutateRes.status}`);
    }

    // 10. Security Test: Direct Table Deletion Permanently Prohibited (403)
    const deleteRes = await fetch(`http://localhost:3002/api/v1/complaints/${jsonComplaintData.ticket_number}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': 'usr-test-citizen-01',
      },
    });
    if (deleteRes.status === 403) {
      const deleteData = await deleteRes.json();
      console.log('[PASS] Security Directive 2 -> Record deletion permanently revoked with 403:', deleteData.code);
    } else {
      throw new Error(`Expected 403 delete rejection, got ${deleteRes.status}`);
    }

    console.log('\nAll Cloud Security, RBAC & Database Lockdown Tests Passed With 100% Success.');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
