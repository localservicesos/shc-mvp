-- seed-test.sql — Mock data for manual UI testing on the deployed Supabase project.
--
-- WHAT THIS CREATES:
--   - 200 customers
--   - 1–3 vehicles per customer (~400 vehicles total)
--   - 3–7 jobs per customer, statuses: booked / completed / cancelled (~1,000 jobs total)
--   - Invoices for every completed job (~600 invoices)
--
-- HOW TO RUN:
--   1. Go to Supabase dashboard → SQL Editor
--   2. Paste the full contents of this file
--   3. Click Run
--
-- HOW TO CLEAN UP:
--   delete from invoices  where invoice_number like 'MOCK-%';
--   delete from jobs      where notes like '%[mock]%';
--   delete from vehicles  where notes like '%[mock]%';
--   delete from customers where notes like '%[mock]%';
--
-- SAFE TO RE-RUN: cleanup runs first, so no duplicates.
-- REQUIREMENT: business 'sunshine-hot-cars' and its service catalog must exist.

do $$
declare
  v_biz_id uuid;

  v_customer_ids  uuid[];
  v_vehicle_ids   uuid[];
  v_service_ids   uuid[];

  v_cust_id   uuid;
  v_veh_id    uuid;
  v_job_id    uuid;
  v_svc_id    uuid;
  v_inv_num   int;
  v_plate_seq int := 0;  -- global vehicle counter so every plate is unique

  -- iteration
  i           int;
  j           int;
  num_vehs    int;
  num_jobs    int;

  -- job fields
  v_status        job_status;
  v_start         timestamptz;
  v_end           timestamptz;
  v_price         numeric(10,2);
  v_discount      numeric(10,2);
  v_extra         numeric(10,2);
  v_job_note      text;

  -- name pools
  first_names text[] := array[
    'James','Sarah','Marcus','Emily','Liam','Olivia','Noah','Ava','William','Sophia',
    'Benjamin','Isabella','Elijah','Mia','Lucas','Charlotte','Mason','Amelia','Logan','Harper',
    'Jack','Chloe','Owen','Ella','Daniel','Lily','Henry','Zoe','Alexander','Grace',
    'Michael','Hannah','Ethan','Natalie','Aiden','Samantha','Matthew','Victoria','Jackson','Addison',
    'Sebastian','Leah','David','Audrey','Joseph','Anna','Carter','Savannah','Wyatt','Brooklyn',
    'John','Skylar','Luke','Claire','Dylan','Stella','Gabriel','Paisley','Isaac','Violet',
    'Anthony','Eleanor','Grayson','Layla','Julian','Riley','Levi','Zoey','Christopher','Nora',
    'Joshua','Lily','Andrew','Hannah','Lincoln','Lillian','Ryan','Aubrey','Nathan','Ellie',
    'Connor','Aria','Caleb','Avery','Aaron','Penelope','Adrian','Madison','Hunter','Luna',
    'Eli','Sofia','Thomas','Quinn','Charlie','Maya','Dominic','Piper','Cameron','Eva'
  ];

  last_names text[] := array[
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
    'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
    'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
    'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
    'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
    'Turner','Phillips','Evans','Parker','Collins','Edwards','Stewart','Morris','Murphy','Cook',
    'Rogers','Morgan','Peterson','Cooper','Reed','Bailey','Bell','Gonzales','Kelly','Howard',
    'Ward','Cox','Diaz','Richardson','Wood','Watson','Brooks','Bennett','Gray','James',
    'Reyes','Cruz','Hughes','Price','Myers','Long','Foster','Sanders','Ross','Morales',
    'Powell','Sullivan','Russell','Ortiz','Jenkins','Gutierrez','Perry','Butler','Barnes','Fisher'
  ];

  makes_models text[][] := array[
    array['Toyota','Camry'],   array['Toyota','Corolla'],  array['Toyota','RAV4'],
    array['Toyota','Hilux'],   array['Toyota','LandCruiser'], array['Mazda','CX-5'],
    array['Mazda','3'],        array['Mazda','CX-9'],      array['Ford','Ranger'],
    array['Ford','Mustang'],   array['Ford','Escape'],     array['Holden','Commodore'],
    array['Holden','Colorado'], array['Hyundai','Tucson'],  array['Hyundai','i30'],
    array['Hyundai','Santa Fe'],array['Kia','Sportage'],   array['Kia','Sorento'],
    array['Honda','Civic'],    array['Honda','CR-V'],      array['Volkswagen','Golf'],
    array['Volkswagen','Tiguan'],array['Subaru','Outback'], array['Subaru','Forester'],
    array['Nissan','X-Trail'], array['Nissan','Navara'],   array['BMW','3 Series'],
    array['BMW','X5'],         array['Mercedes-Benz','C-Class'],array['Audi','A4'],
    array['Jeep','Wrangler'],  array['Mitsubishi','Triton'],array['Isuzu','D-Max'],
    array['Suzuki','Swift'],   array['Lexus','RX'],        array['Chevrolet','Silverado']
  ];

  colors text[] := array[
    'White','Black','Silver','Grey','Red','Blue','Dark Blue','Pearl White',
    'Gunmetal','Bronze','Green','Orange','Yellow','Burgundy','Champagne'
  ];

  suburbs text[] := array[
    'Brisbane QLD 4000','South Brisbane QLD 4101','Fortitude Valley QLD 4006',
    'New Farm QLD 4005','Paddington QLD 4064','Toowong QLD 4066',
    'St Lucia QLD 4067','Indooroopilly QLD 4068','Kenmore QLD 4069',
    'Fig Tree Pocket QLD 4069','Carindale QLD 4152','Coorparoo QLD 4151',
    'Woolloongabba QLD 4102','West End QLD 4101','Graceville QLD 4075',
    'Moorooka QLD 4105','Sunnybank QLD 4109','Runcorn QLD 4113',
    'Eight Mile Plains QLD 4113','Rochedale QLD 4123','Springwood QLD 4127',
    'Logan Central QLD 4114','Beenleigh QLD 4207','Redcliffe QLD 4020',
    'Margate QLD 4019','Strathpine QLD 4500','Kallangur QLD 4503',
    'Caboolture QLD 4510','North Lakes QLD 4509','Mango Hill QLD 4509'
  ];

  statuses      job_status[] := array['booked','completed','completed','completed','cancelled']::job_status[];
  plate_letters text[]       := array['A','B','C','D','E','F','G','H','J','K','L','M','N','P','R','S','T','U','V','W','X','Y','Z'];

  v_inv_suffix  text;

begin
  select id into v_biz_id from businesses where slug = 'sunshine-hot-cars';

  if v_biz_id is null then
    raise exception 'Business sunshine-hot-cars not found. Run seed.sql first.';
  end if;

  -- collect all active service ids
  select array_agg(id) into v_service_ids
  from services
  where business_id = v_biz_id and active = true;

  if v_service_ids is null or array_length(v_service_ids, 1) = 0 then
    raise exception 'No services found. Run seed.sql first.';
  end if;

  -- ------------------------------------------------------------------
  -- cleanup previous mock data
  -- ------------------------------------------------------------------
  delete from invoices  where business_id = v_biz_id and invoice_number like 'MOCK-%';
  delete from jobs      where business_id = v_biz_id and notes like '%[mock]%';
  delete from vehicles  where business_id = v_biz_id and notes like '%[mock]%';
  delete from customers where business_id = v_biz_id and notes like '%[mock]%';

  v_inv_num := 1;

  -- ------------------------------------------------------------------
  -- main loop: 200 customers
  -- ------------------------------------------------------------------
  for i in 1..200 loop

    -- insert customer
    insert into customers (business_id, name, phone, email, address, notes)
    values (
      v_biz_id,
      first_names[1 + mod(i * 7, array_length(first_names, 1))]
        || ' ' ||
        last_names[1 + mod(i * 13, array_length(last_names, 1))],
      '+61 4' || lpad((10000000 + i * 9973)::text, 8, '0'),
      lower(first_names[1 + mod(i * 7, array_length(first_names, 1))]) || '.' ||
        lower(last_names[1 + mod(i * 13, array_length(last_names, 1))]) ||
        i::text || '@email.com',
      (10 + mod(i, 90))::text || ' '
        || last_names[1 + mod(i * 3, array_length(last_names, 1))]
        || ' St, '
        || suburbs[1 + mod(i, array_length(suburbs, 1))],
      case mod(i, 5)
        when 0 then 'Regular client. Prepaid discount applied. [mock]'
        when 1 then 'Referred by a friend. [mock]'
        when 2 then 'Prefers morning appointments. [mock]'
        when 3 then 'Has two vehicles — both need regular detailing. [mock]'
        else        'New customer. [mock]'
      end
    )
    returning id into v_cust_id;

    -- 1–3 vehicles per customer
    num_vehs := 1 + mod(i, 3);

    for j in 1..num_vehs loop
      v_plate_seq := v_plate_seq + 1;
      insert into vehicles (business_id, customer_id, make, model, year, color, plate, notes)
      values (
        v_biz_id,
        v_cust_id,
        makes_models[1 + mod(i * j * 3, array_length(makes_models, 1))][1],
        makes_models[1 + mod(i * j * 3, array_length(makes_models, 1))][2],
        2015 + mod(i + j, 10),
        colors[1 + mod(i * j, array_length(colors, 1))],
        plate_letters[1 + mod(i,     array_length(plate_letters, 1))]
          || plate_letters[1 + mod(i * 3, array_length(plate_letters, 1))]
          || plate_letters[1 + mod(i * 7, array_length(plate_letters, 1))]
          || lpad(v_plate_seq::text, 3, '0'),
        case when j = 1 then '[mock]' else 'Second vehicle. [mock]' end
      )
      returning id into v_veh_id;

      -- store first vehicle per customer for job linking
      if j = 1 then
        v_vehicle_ids := array_append(v_vehicle_ids, v_veh_id);
      end if;
    end loop;

    -- 3–7 jobs per customer
    num_jobs := 3 + mod(i, 5);

    for j in 1..num_jobs loop
      v_status  := statuses[1 + mod(i * j * 11, array_length(statuses, 1))];
      v_svc_id  := v_service_ids[1 + mod(i * j * 7, array_length(v_service_ids, 1))];
      v_veh_id  := v_vehicle_ids[array_length(v_vehicle_ids, 1)];

      select base_price into v_price from services where id = v_svc_id;

      -- Scatter jobs across the past 90 days and next 14 days.
      -- Each of a customer's jobs lands on a DIFFERENT day (base day from i,
      -- plus j*3 days apart): jobs run 7am–8pm at most, so distinct days can
      -- never trip the jobs_vehicle_no_overlap exclusion constraint.
      v_start := now()
        - interval '90 days'
        + make_interval(days => mod(i * 17, 83) + j * 3)
        + make_interval(hours => 7 + mod(i + j, 9));
      v_end   := v_start + make_interval(hours => 1 + mod(i * j, 4));

      -- occasional discount or extra charge
      v_discount := case when mod(i * j, 7) = 0 then round((v_price * 0.1)::numeric, 2) else 0 end;
      v_extra    := case when mod(i * j, 11) = 0 then 50.00 else 0 end;

      v_job_note := case mod(j, 6)
        when 0 then 'Very dirty vehicle on arrival. Extra time needed. [mock]'
        when 1 then 'Customer requested extra attention to interior. [mock]'
        when 2 then 'Quick job, customer waiting. [mock]'
        when 3 then 'Pet hair removal required. [mock]'
        when 4 then 'Recent road trip — heavy grime. [mock]'
        else        '[mock]'
      end;

      insert into jobs (
        business_id, customer_id, vehicle_id, service_id,
        scheduled_start, scheduled_end,
        status, price, discount, extra, adjustment_note, notes
      )
      values (
        v_biz_id, v_cust_id, v_veh_id, v_svc_id,
        v_start, v_end,
        v_status, v_price, v_discount, v_extra,
        case when v_discount > 0 then 'Loyalty discount'
             when v_extra   > 0 then 'Extra dirty — additional charge'
             else null end,
        v_job_note
      )
      returning id into v_job_id;

      -- create invoice for completed jobs
      if v_status = 'completed' then
        v_inv_suffix := lpad(v_inv_num::text, 5, '0');
        declare
          v_total    numeric(10,2) := v_price - v_discount + v_extra;
          v_subtotal numeric(10,2) := round(v_total / 1.1, 2);
          v_gst      numeric(10,2) := round(v_total - v_total / 1.1, 2);
        begin
          insert into invoices (
            business_id, job_id, invoice_number,
            subtotal, gst_amount, amount,
            status, sent_at, paid_at
          )
          values (
            v_biz_id, v_job_id, 'MOCK-' || v_inv_suffix,
            v_subtotal, v_gst, v_total,
            (case
              when mod(v_inv_num, 5) = 0 then 'draft'
              when mod(v_inv_num, 3) = 0 then 'sent'
              else                            'paid'
            end)::invoice_status,
            case when mod(v_inv_num, 3) != 0 and mod(v_inv_num, 5) != 0
              then v_end + interval '1 hour' else null end,
            case when mod(v_inv_num, 5) != 0 and mod(v_inv_num, 3) != 0
              then v_end + interval '1 day' else null end
          );
        end;
        v_inv_num := v_inv_num + 1;
      end if;

    end loop; -- jobs

  end loop; -- customers

  raise notice 'Mock data created: 200 customers, ~400 vehicles, ~1000 jobs, ~600 invoices.';
end;
$$;
